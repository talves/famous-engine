/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

// TODO This will be removed once `Mesh#setGeometry` no longer accepts
// geometries defined by name.
import * as Geometry from '../webgl-geometries/primitives';

import { Commands } from '../core/Commands';
import { TransformSystem } from '../core/TransformSystem';
import { Plane } from '../webgl-geometries/primitives/Plane';
import { OpacitySystem } from '../core/OpacitySystem';

/**
 * The Mesh class is responsible for providing the API for how
 * a RenderNode will interact with the WebGL API by adding
 * a set of commands to the renderer.
 *
 * @class Mesh
 * @constructor
 * @renderable
 *
 * @param {Node} node Dispatch LocalDispatch to be retrieved
 * @param {Object} options Optional params for configuring Mesh
 *
 * @return {undefined} undefined
 */

var INPUTS = ['baseColor', 'normals', 'glossiness', 'positionOffset'];

class Mesh {
  constructor(node, options) {
    this._node = null;
    this._id = null;
    this._changeQueue = [];
    this._initialized = false;
    this._requestingUpdate = false;
    this._inDraw = false;
    this.value = {
      geometry: new Plane(),
      drawOptions: null,
      color: null,
      expressions: {},
      flatShading: null,
      glossiness: null,
      positionOffset: null,
      normals: null
    };
    if (node) node.addComponent(this);
    if (options) this.setDrawOptions(options);
  }
  /**
   * Pass custom options to Mesh, such as a 3 element map
   * which displaces the position of each vertex in world space.
   *
   * @method
   *
   * @param {Object} options Draw options
   * @return {Mesh} Current mesh
   */
  setDrawOptions(options) {
    this._changeQueue.push(Commands.GL_SET_DRAW_OPTIONS);
    this._changeQueue.push(options);

    this.value.drawOptions = options;
    return this;
  };

  /**
   * Get the mesh's custom options.
   *
   * @method
   *
   * @returns {Object} Options
   */
  getDrawOptions() {
    return this.value.drawOptions;
  };

  /**
   * Assigns a geometry to be used for this mesh. Sets the geometry from either
   * a 'Geometry' or a valid primitive (string) name. Queues the set command for this
   * geometry and looks for buffers to send to the renderer to update geometry.
   *
   * @method
   *
   * @param {Geometry|String} geometry Geometry to be associated with the mesh.
   * @param {Object} options Various configurations for geometries.
   *
   * @return {Mesh} Mesh
   */
  setGeometry(geometry, options) {
    if (typeof geometry === 'string') {
      if (!Geometry[geometry])
        throw 'Invalid geometry: "' + geometry + '".'; else {
        console.warn(
          'Mesh#setGeometry using the geometry registry is deprecated!\n' +
          'Instantiate the geometry directly via `new ' + geometry +
          '(options)` instead!'
        );

        geometry = new Geometry[geometry](options);
      }
    }

    if (this.value.geometry !== geometry || this._inDraw) {
      if (this._initialized) {
        this._changeQueue.push(Commands.GL_SET_GEOMETRY);
        this._changeQueue.push(geometry.spec.id);
        this._changeQueue.push(geometry.spec.type);
        this._changeQueue.push(geometry.spec.dynamic);
      }
      this._requestUpdate();
      this.value.geometry = geometry;
    }

    if (this._initialized) {
      if (this._node) {
        var i = this.value.geometry.spec.invalidations.length;
        if (i) this._requestUpdate();
        while (i--) {
          this.value.geometry.spec.invalidations.pop();
          this._changeQueue.push(Commands.GL_BUFFER_DATA);
          this._changeQueue.push(this.value.geometry.spec.id);
          this._changeQueue.push(this.value.geometry.spec.bufferNames[i]);
          this._changeQueue.push(this.value.geometry.spec.bufferValues[i]);
          this._changeQueue.push(this.value.geometry.spec.bufferSpacings[i]);
          this._changeQueue.push(this.value.geometry.spec.dynamic);
        }
      }
    }
    return this;
  };

  /**
   * Gets the geometry of a mesh.
   *
   * @method
   *
   * @returns {Geometry} Geometry
   */
  getGeometry() {
    return this.value.geometry;
  };

  /**
  * Changes the color of Mesh, passing either a material expression or
  * color using the 'Color' utility component.
  *
  * @method
  *
  * @param {Object|Color} color Material, image, vec3, or Color instance
  *
  * @return {Mesh} Mesh
  */
  setBaseColor(color) {
    var uniformValue;
    var isMaterial = color.__isAMaterial__;
    var isColor = !!color.getNormalizedRGBA;

    if (isMaterial) {
      addMeshToMaterial(this, color, 'baseColor');
      this.value.color = null;
      this.value.expressions.baseColor = color;
      uniformValue = color;
    } else if (isColor) {
      this.value.expressions.baseColor = null;
      this.value.color = color;
      uniformValue = color.getNormalizedRGBA();
    }

    if (this._initialized) {

      // If a material expression

      if (color.__isAMaterial__) {
        this._changeQueue.push(Commands.MATERIAL_INPUT);
      }

      // If a color component
      else if (color.getNormalizedRGB) {
        this._changeQueue.push(Commands.GL_UNIFORMS);
      }

      this._changeQueue.push('u_baseColor');
      this._changeQueue.push(uniformValue);
    }

    this._requestUpdate();

    return this;
  };

  /**
   * Returns either the material expression or the color instance of Mesh.
   *
   * @method
   *
   * @returns {MaterialExpress|Color} MaterialExpress or Color instance
   */
  getBaseColor() {
    return this.value.expressions.baseColor || this.value.color;
  };

  /**
   * Change whether the Mesh is affected by light. Default is true.
   *
   * @method
   *
   * @param {boolean} bool Boolean for setting flat shading
   *
   * @return {Mesh} Mesh
   */
  setFlatShading(bool) {
    if (this._inDraw || this.value.flatShading !== bool) {
      this.value.flatShading = bool;
      if (this._initialized) {
        this._changeQueue.push(Commands.GL_UNIFORMS);
        this._changeQueue.push('u_flatShading');
        this._changeQueue.push(bool ? 1 : 0);
      }
      this._requestUpdate();
    }

    return this;
  };

  /**
   * Returns a boolean for whether Mesh is affected by light.
   *
   * @method
   *
   * @returns {Boolean} Boolean
   */
  getFlatShading() {
    return this.value.flatShading;
  };


  /**
   * Defines a 3-element map which is used to provide significant physical
   * detail to the surface by perturbing the facing direction of each individual
   * pixel.
   *
   * @method
   *
   * @param {Object|Array} materialExpression Material, Image or vec3
   *
   * @return {Mesh} Mesh
   */
  setNormals(materialExpression) {
    var isMaterial = materialExpression.__isAMaterial__;

    if (isMaterial) {
      addMeshToMaterial(this, materialExpression, 'normals');
      this.value.expressions.normals = materialExpression;
    }

    if (this._initialized) {
      this._changeQueue.push(materialExpression.__isAMaterial__ ? Commands.MATERIAL_INPUT : Commands.GL_UNIFORMS);
      this._changeQueue.push('u_normals');
      this._changeQueue.push(materialExpression);
    }

    this._requestUpdate();

    return this;
  };

  /**
   * Returns the Normals expression of Mesh
   *
   * @method
   *
   * @param {materialExpression} materialExpression Normals Material Expression
   *
   * @returns {Array} The normals expression for Mesh
   */
  getNormals(materialExpression) {
    return this.value.expressions.normals;
  };

  /**
   * Defines the glossiness of the mesh from either a material expression or a
   * scalar value
   *
   * @method
   *
   * @param {MaterialExpression|Color} glossiness Accepts either a material expression or Color instance
   * @param {Number} strength Optional value for changing the strength of the glossiness
   *
   * @return {Mesh} Mesh
   */
  setGlossiness(glossiness, strength) {
    var isMaterial = glossiness.__isAMaterial__;
    var isColor = !!glossiness.getNormalizedRGB;

    if (isMaterial) {
      addMeshToMaterial(this, glossiness, 'glossiness');
      this.value.glossiness = [null, null];
      this.value.expressions.glossiness = glossiness;
    } else if (isColor) {
      this.value.expressions.glossiness = null;
      this.value.glossiness = [glossiness, strength || 20];
      glossiness = glossiness ? glossiness.getNormalizedRGB() : [0, 0, 0];
      glossiness.push(strength || 20);
    }

    if (this._initialized) {
      this._changeQueue.push(glossiness.__isAMaterial__ ? Commands.MATERIAL_INPUT : Commands.GL_UNIFORMS);
      this._changeQueue.push('u_glossiness');
      this._changeQueue.push(glossiness);
    }

    this._requestUpdate();
    return this;
  };

  /**
   * Returns material expression or scalar value for glossiness.
   *
   * @method
   *
   * @returns {MaterialExpress|Number} MaterialExpress or Number
   */
  getGlossiness() {
    return this.value.expressions.glossiness || this.value.glossiness;
  };

  /**
   * Defines 3 element map which displaces the position of each vertex in world
   * space.
   *
   * @method
   *
   * @param {MaterialExpression|Array} materialExpression Position offset expression
   *
   * @return {Mesh} Mesh
   */
  setPositionOffset(materialExpression) {
    var uniformValue;
    var isMaterial = materialExpression.__isAMaterial__;

    if (isMaterial) {
      addMeshToMaterial(this, materialExpression, 'positionOffset');
      this.value.expressions.positionOffset = materialExpression;
      uniformValue = materialExpression;
    } else {
      this.value.expressions.positionOffset = null;
      this.value.positionOffset = materialExpression;
      uniformValue = this.value.positionOffset;
    }

    if (this._initialized) {
      this._changeQueue.push(materialExpression.__isAMaterial__ ? Commands.MATERIAL_INPUT : Commands.GL_UNIFORMS);
      this._changeQueue.push('u_positionOffset');
      this._changeQueue.push(uniformValue);
    }

    this._requestUpdate();

    return this;
  };

  /**
   * Returns position offset.
   *
   * @method
   *
   * @returns {MaterialExpress|Number} MaterialExpress or Number
   */
  getPositionOffset() {
    return this.value.expressions.positionOffset || this.value.positionOffset;
  };

  /**
   * Get the mesh's expressions
   *
   * @method
   *
   * @returns {Object} Object
   */
  getMaterialExpressions() {
    return this.value.expressions;
  };

  /**
   * Get the mesh's value
   *
   * @method
   *
   * @returns {Number} Value
   */
  getValue() {
    return this.value;
  };

  /**
   * Queues the invalidations for Mesh
   *
   * @param {String} expressionName Expression Name
   *
   * @return {Mesh} Mesh
   */
  _pushInvalidations(expressionName) {
    var uniformKey;
    var expression = this.value.expressions[expressionName];
    var sender = this._node;
    if (expression) {
      expression.traverse(function(node) {
        var i = node.invalidations.length;
        while (i--) {
          uniformKey = node.invalidations.pop();
          sender.sendDrawCommand(Commands.GL_UNIFORMS);
          sender.sendDrawCommand(uniformKey);
          sender.sendDrawCommand(node.uniforms[uniformKey]);
        }
      });
    }
    return this;
  };

  /**
  * Sends draw commands to the renderer
  *
  * @private
  * @method
  *
  * @return {undefined} undefined
  */
  onUpdate() {
    var node = this._node;
    var queue = this._changeQueue;

    if (node && node.isMounted()) {
      node.sendDrawCommand(Commands.WITH);
      node.sendDrawCommand(node.getLocation());

      // If any invalidations exist, push them into the queue
      if (this.value.color && this.value.color.isActive()) {
        this._node.sendDrawCommand(Commands.GL_UNIFORMS);
        this._node.sendDrawCommand('u_baseColor');
        this._node.sendDrawCommand(this.value.color.getNormalizedRGBA());
        this._node.requestUpdateOnNextTick(this._id);
      }
      if (this.value.glossiness && this.value.glossiness[0] && this.value.glossiness[0].isActive()) {
        this._node.sendDrawCommand(Commands.GL_UNIFORMS);
        this._node.sendDrawCommand('u_glossiness');
        var glossiness = this.value.glossiness[0].getNormalizedRGB();
        glossiness.push(this.value.glossiness[1]);
        this._node.sendDrawCommand(glossiness);
        this._node.requestUpdateOnNextTick(this._id);
      } else {
        this._requestingUpdate = false;
      }

      // If any invalidations exist, push them into the queue
      this._pushInvalidations('baseColor');
      this._pushInvalidations('positionOffset');
      this._pushInvalidations('normals');
      this._pushInvalidations('glossiness');

      for (var i = 0; i < queue.length; i++) {
        node.sendDrawCommand(queue[i]);
      }

      queue.length = 0;
    }
  };

  /**
   * Save reference to node, set its ID and call draw on Mesh.
   *
   * @method
   *
   * @param {Node} node Node
   * @param {Number} id Identifier for Mesh
   *
   * @return {undefined} undefined
   */
  onMount(node, id) {
    this._node = node;
    this._id = id;

    TransformSystem.makeCalculateWorldMatrixAt(node.getLocation());
    OpacitySystem.makeCalculateWorldOpacityAt(node.getLocation());

    this.draw();
  };

  /**
   * Queues the command for dismounting Mesh
   *
   * @method
   *
   * @return {undefined} undefined
   */
  onDismount() {
    this._initialized = false;
    this._inDraw = false;

    this._node.sendDrawCommand(Commands.WITH);
    this._node.sendDrawCommand(this._node.getLocation());
    this._node.sendDrawCommand(Commands.GL_REMOVE_MESH);

    this._node = null;
    this._id = null;
  };

  /**
   * Makes Mesh visible
   *
   * @method
   *
   * @return {undefined} undefined
   */
  onShow() {
    this._changeQueue.push(Commands.GL_MESH_VISIBILITY, true);

    this._requestUpdate();
  };

  /**
   * Makes Mesh hidden
   *
   * @method
   *
   * @return {undefined} undefined
   */
  onHide() {
    this._changeQueue.push(Commands.GL_MESH_VISIBILITY, false);

    this._requestUpdate();
  };

  /**
   * Receives transform change updates from the scene graph.
   *
   * @method
   * @private
   *
   * @param {Array} transform Transform matric
   *
   * @return {undefined} undefined
   */
  onTransformChange(transform) {
    if (this._initialized) {
      this._changeQueue.push(Commands.GL_UNIFORMS);
      this._changeQueue.push('u_transform');
      this._changeQueue.push(transform.getWorldTransform());
    }

    this._requestUpdate();
  };

  /**
   * Receives size change updates from the scene graph.
   *
   * @method
   * @private
   *
   * @param {Number} x width of the Node the Mesh is attached to
   * @param {Number} y height of the Node the Mesh is attached to
   * @param {Number} z depth of the Node the Mesh is attached to
   *
   * @return {undefined} undefined
   */
  onSizeChange(x, y, z) {
    if (this._initialized) {
      this._changeQueue.push(Commands.GL_UNIFORMS);
      this._changeQueue.push('u_size');
      this._changeQueue.push([x, y, z]);
    }

    this._requestUpdate();
  };

  /**
   * Receives opacity change updates from the scene graph.
   *
   * @method
   * @private
   *
   * @param {Number} opacity Opacity
   *
   * @return {undefined} undefined
   */
  onOpacityChange(opacity) {
    if (this._initialized) {
      this._changeQueue.push(Commands.GL_UNIFORMS);
      this._changeQueue.push('u_opacity');
      this._changeQueue.push(opacity.getWorldOpacity());
    }

    this._requestUpdate();
  };

  /**
   * Adds functionality for UI events (TODO)
   *
   * @method
   *
   * @param {String} UIEvent UI Event
   *
   * @return {undefined} undefined
   */
  onAddUIEvent(UIEvent) {
    //TODO
  };

  /**
   * Queues instance to be updated.
   *
   * @method
   *
   * @return {undefined} undefined
   */
  _requestUpdate() {
    if (!this._requestingUpdate && this._node) {
      this._node.requestUpdate(this._id);
      this._requestingUpdate = true;
    }
  };

  /**
   * Initializes the mesh with appropriate listeners.
   *
   * @method
   *
   * @return {undefined} undefined
   */
  init() {
    this._initialized = true;
    this.onTransformChange(TransformSystem.get(this._node.getLocation()));
    this.onOpacityChange(OpacitySystem.get(this._node.getLocation()));
    var size = this._node.getSize();
    this.onSizeChange(size[0], size[1], size[2]);
    this._requestUpdate();
  };

  /**
   * Draws given Mesh's current state.
   *
   * @method
   *
   * @return {undefined} undefined
   */
  draw() {
    this._inDraw = true;

    this.init();

    var value = this.getValue();

    if (value.geometry != null) this.setGeometry(value.geometry);
    if (value.color != null) this.setBaseColor(value.color);
    if (value.glossiness != null) this.setGlossiness.apply(this, value.glossiness);
    if (value.drawOptions != null) this.setDrawOptions(value.drawOptions);
    if (value.flatShading != null) this.setFlatShading(value.flatShading);

    if (value.expressions.normals != null) this.setNormals(value.expressions.normals);
    if (value.expressions.baseColor != null) this.setBaseColor(value.expressions.baseColor);
    if (value.expressions.glossiness != null) this.setGlossiness(value.expressions.glossiness);
    if (value.expressions.positionOffset != null) this.setPositionOffset(value.expressions.positionOffset);

    this._inDraw = false;
  };

}

function addMeshToMaterial(mesh, material, name) {
  var expressions = mesh.value.expressions;
  var previous = expressions[name];
  var shouldRemove = true;
  var len = material.inputs;

  while (len--)
  addMeshToMaterial(mesh, material.inputs[len], name);

  len = INPUTS.length;

  while (len--)
  shouldRemove |= (name !== INPUTS[len] && previous !== expressions[INPUTS[len]]);

  if (shouldRemove)
    material.meshes.splice(material.meshes.indexOf(previous), 1);

  if (material.meshes.indexOf(mesh) === -1)
    material.meshes.push(mesh);
}

export { Mesh };
