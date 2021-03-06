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
var test = require('tape');
var Geometry = require('../../src/webgl-geometries/Geometry');

var primitives = {
    Box: require('../../src/webgl-geometries/primitives/Box'),
    Circle: require('../../src/webgl-geometries/primitives/Circle'),
    Cylinder: require('../../src/webgl-geometries/primitives/Cylinder'),
    GeodesicSphere: require('../../src/webgl-geometries/primitives/GeodesicSphere'),
    Icosahedron: require('../../src/webgl-geometries/primitives/Icosahedron'),
    ParametricCone: require('../../src/webgl-geometries/primitives/ParametricCone'),
    Plane: require('../../src/webgl-geometries/primitives/Plane'),
    Sphere: require('../../src/webgl-geometries/primitives/Sphere'),
    Tetrahedron: require('../../src/webgl-geometries/primitives/Tetrahedron'),
    Torus: require('../../src/webgl-geometries/primitives/Torus'),
    Triangle: require('../../src/webgl-geometries/primitives/Triangle')
};

test('Primitives', function(t) {

    t.test('Primitives.noParameter', function(t) {
        for (var name in primitives) {
            var primitive = new primitives[name]();

            t.ok(primitive instanceof Geometry, 'should be an instance of a static geometry');

            t.notEquals(primitive.spec.bufferNames.indexOf('a_texCoord'), -1, 'should contain a texCoord buffer');
            t.notEquals(primitive.spec.bufferNames.indexOf('a_normals'), -1, 'should contain a normal buffer');
            t.notEquals(primitive.spec.bufferNames.indexOf('a_pos'), -1, 'should contain a pos buffer');

            if (name !== 'Circle') {
                t.notEquals(primitive.spec.bufferNames.indexOf('indices'), -1, 'should contain an index buffer');
            }
        }
		t.end();
    });

    t.test('Primitives.optionsParameter', function(t) {
        for (var name in primitives) {
            var primitive = new primitives[name]({type:'POINTS'});

            t.ok(primitive instanceof Geometry, 'should be an instance of a static geometry');
            t.ok(primitive instanceof primitives[name], 'should be an instance of its constructor function');

            t.notEquals(primitive.spec.bufferNames.indexOf('a_texCoord'), -1, 'should contain a texCoord buffer');
            t.notEquals(primitive.spec.bufferNames.indexOf('a_normals'), -1, 'should contain a normal buffer');
            t.notEquals(primitive.spec.bufferNames.indexOf('a_pos'), -1, 'should contain a pos buffer');

            t.equals(primitive.spec.type, 'POINTS', 'draw type should be passed through');

            if (name !== 'Circle') {
                t.notEquals(primitive.spec.bufferNames.indexOf('indices'), -1, 'should contain an index buffer');
            }
        }
		t.end();
    });


    t.end();
});
