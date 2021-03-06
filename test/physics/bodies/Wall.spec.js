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

var Particle = require('../../../src/physics/bodies/Particle');
var Wall = require('../../../src/physics/bodies/Wall');
var test = require('tape');

test('Wall', function(t) {
    var w = new Wall({direct: Wall.DOWN});

    t.test('should extend Particle', function(t) {
        t.assert(Wall instanceof Function, 'Wall should be a constructor');

        t.assert(w instanceof Wall && w instanceof Particle, 'new boxes should be instances of Particle');

        t.end();
    });

    t.test('mass properties', function(t) {
        t.assert(w.inverseMass === 0, 'walls should have 0 inverse mass');
        var i = w.inverseInertia.get();
        t.assert(i[0] === 0 && i[4] === 0 && i[8] === 0, 'walls should have 0 inverse moments of inertia');

        t.end();
    });

    t.end();
});
