!function(thisObj) {
  var isCompItem = function(o) {
    return o instanceof CompItem;
  };
  var isProperty = function(o) {
    return o instanceof Property;
  };
  var forEach = function(items, callback) {
    var len = items.length;
    for (var i = 0; i < len; ++i) {
      callback(items[i], i);
    }
  };
  var ObjectPrototype = Object.prototype;
  var isArray = function(o) {
    return ObjectPrototype.toString.call(o) === '[object Array]';
  };
  var activeCompItemEnviron = function(callback) {
    var activeItem = app.project.activeItem;
    isCompItem(activeItem) && callback(activeItem);
  };
  var eachSelectedProperties = function(callback) {
    activeCompItemEnviron(function(compItem) {
      forEach(compItem.selectedProperties, function(property) {
        isProperty(property) && property.canSetExpression && callback(property);
      });
    });
  };
  var eachSelectedKeyframe = function(callback) {
    eachSelectedProperties(function(property) {
      var selectedKeys = property.selectedKeys;
      var len = selectedKeys.length;
      for (var i = 0; i < len; ++i) {
        callback(property, selectedKeys[i]);
      }
    });
  };
  var map = function(items, callback) {
    var r = new Array(items.length);
    var len = items.length;
    for (var i = 0; i < len; ++i) {
      r[i] = callback(items[i], i);
    }
    return r;
  };
  var temporalEaseToKeyframeEase = function(KeyframeEaseArr) {
    return map(KeyframeEaseArr, function(v) {
      return new KeyframeEase(v.speed, v.influence || 0.1);
    });
  };
  var clamp = function(value, min, max) {
    return Math.min(Math.max(value, min), max);
  };
  var calcInfluence = function(influence) {
    return clamp(influence * 100, 0.1, 100);
  };
  var easeIn = function(val, property, keyID, influence, defaultSpeed) {
    return new KeyframeEase(keyID > 1 ? calcSpeed(property, keyID - 1, keyID, val, influence) : defaultSpeed, influence);
  };
  var easeOut = function(val, property, keyID, influence, defaultSpeed) {
    return new KeyframeEase(keyID <= property.selectedKeys.length ? calcSpeed(property, keyID, keyID + 1, val, influence) : defaultSpeed, influence);
  };
  var calcSpeed = function(property, keyID1, keyID2, curveValue, influence) {
    var speed = 0;
    switch (property.propertyValueType) {
     case PropertyValueType.SHAPE:
     case PropertyValueType.NO_VALUE:
     case PropertyValueType.CUSTOM_VALUE:
      return speed;

     case PropertyValueType.COLOR:
      speed *= 255;
      break;

     default:
      {
        var keyValue1 = property.keyValue(keyID1);
        var keyValue2 = property.keyValue(keyID2);
        var keyTime1 = property.keyTime(keyID1);
        var keyTime2 = property.keyTime(keyID2);
        var time = keyTime2 - keyTime1;
        var value = void 0;
        if (isArray(keyValue1)) {
          value = keyValue2[0] - keyValue1[0];
        } else {
          value = keyValue2 - keyValue1;
        }
        speed = value / time;
      }
      break;
    }
    return speed * curveValue * 100 / influence;
  };
  var calcEase = function(curveValue, arr, type, property, keyID) {
    var temp = type === 1 ? [ easeIn, 2, 3 ] : [ easeOut, 0, 1 ];
    return map(arr, function(v) {
      return temp[0](curveValue[temp[2]], property, keyID, calcInfluence(curveValue[temp[1]]), v.speed);
    });
  };
  var setSelectedKeyframeCurve = function(curveValue) {
    var left = 2;
    eachSelectedKeyframe(function(property, keyID) {
      var keyInTemporalEase = property.keyInTemporalEase(keyID);
      var keyOutTemporalEase = property.keyOutTemporalEase(keyID);
      if (left === 1) {
        property.setTemporalEaseAtKey(keyID, calcEase(curveValue, keyInTemporalEase, left, property, keyID), temporalEaseToKeyframeEase(keyOutTemporalEase));
        left = 2;
      } else {
        property.setTemporalEaseAtKey(keyID, temporalEaseToKeyframeEase(keyInTemporalEase), calcEase(curveValue, keyOutTemporalEase, left, property, keyID));
        left = 1;
      }
    });
  };
  var watch2 = function(obj, key, callback) {
    obj.watch(key, function(_a, _b, val) {
      callback(val);
    });
  };
  var cubicBezier = function(t, p1, p2, p3, p4) {
    var tmp = 1 - t;
    var b1 = Math.pow(t, 3);
    var b2 = Math.pow(t, 2) * 3 * tmp;
    var b3 = Math.pow(tmp, 2) * 3 * t;
    var b4 = Math.pow(tmp, 3);
    return [ p1[0] * b1 + p2[0] * b2 + p3[0] * b3 + p4[0] * b4, p1[1] * b1 + p2[1] * b2 + p3[1] * b3 + p4[1] * b4 ];
  };
  var intFillWithStroke = function(graph, style) {
    if (style.stroke) {
      graph.strokePath(graph.newPen(0, style.stroke.color, style.stroke.width));
    }
    if (style.fill) {
      graph.fillPath(graph.newBrush(0, style.fill));
    }
  };
  var Graphics = {
    setFgColor: function(element, color) {
      element.graphics.foregroundColor = element.graphics.newPen(0, color, 1);
    },
    setBgColor: function(element, color) {
      element.graphics.backgroundColor = element.graphics.newBrush(0, color);
    },
    fillBg: function(graph, size, color) {
      graph.rectPath(0, 0, size[0], size[1]);
      graph.fillPath(graph.newBrush(0, color));
    },
    drawLine: function(graph, fromPos, toPos, width, color) {
      graph.newPath();
      graph.moveTo(fromPos[0], fromPos[1]);
      graph.lineTo(toPos[0], toPos[1]);
      graph.strokePath(graph.newPen(0, color, width ? width : 1));
    },
    drawSquare: function(graph, position, size, color) {
      var temp = size / 2;
      graph.rectPath(position[0] - temp, position[1] - temp, size, size);
      graph.fillPath(graph.newBrush(0, color));
    },
    drawPoint: function(graph, position, size, color) {
      var temp = size / 2;
      graph.ellipsePath(position[0] - temp, position[1] - temp, size, size);
      graph.fillPath(graph.newBrush(0, color));
    },
    drawRect: function(graph, sourceRect, style) {
      graph.newPath();
      var stroke = style.stroke ? style.stroke[1] : 0;
      var offset = stroke * 2;
      graph.rectPath(sourceRect[0] + stroke, sourceRect[1] + stroke, sourceRect[2] - offset, sourceRect[3] - offset);
      intFillWithStroke(graph, style);
    },
    drawCircle: function(graph, sourceRect, style) {
      graph.newPath();
      var stroke = style.stroke ? style.stroke[1] : 0;
      var offset = stroke * 2;
      graph.ellipsePath(sourceRect[0] + stroke, sourceRect[1] + stroke, sourceRect[2] - offset, sourceRect[3] - offset);
      intFillWithStroke(graph, style);
    },
    drawString: function(graph, text, color, x, y, font) {
      graph.drawString(text, graph.newPen(0, color, 1), x || 0, y || 0, font);
    },
    drawPath: function(graph, points, style, close) {
      graph.newPath();
      graph.moveTo(points[0][0], points[0][1]);
      var i = 0;
      var len = points.length;
      while (++i < len) {
        graph.lineTo(points[i][0], points[i][1]);
      }
      intFillWithStroke(graph, style);
      close && graph.closePath();
    },
    drawGrid: function(graph, size, row, col, stroke) {
      var w = size[0] / row;
      var h = size[1] / col;
      var x;
      var y;
      graph.newPath();
      for (var i = 0; i < row; ++i) {
        x = w * i;
        graph.moveTo(x, 0);
        graph.lineTo(x, size[1]);
        for (var j = 0; j < col; ++j) {
          y = h * j;
          graph.moveTo(0, y);
          graph.lineTo(size[0], y);
        }
      }
      graph.strokePath(graph.newPen(0, stroke[0], stroke[1]));
    }
  };
  var layout = function(e) {
    e.layout.layout(true);
    e.layout.resize();
  };
  var Curves = function() {
    function Curves(cv, value, style) {
      this.cv = cv;
      this.size = cv.size;
      this.style = style;
      this.handleState = 0;
      this.pointOffset = this.style.pointSize / 2;
      this.inPoint = [ this.pointOffset, this.size[1] - this.pointOffset ];
      this.outPoint = [ this.size[0] - this.pointOffset, this.pointOffset ];
      this.value = value;
      this.inHandle = [ value[0] * this.size[0], this.size[1] - value[1] * this.size[1] ];
      this.outputHandle = [ this.size[0] - value[2] * this.size[0], value[3] * this.size[1] ];
      this.draw();
    }
    Curves.prototype.draw = function() {
      var _this = this;
      var i;
      var graph = this.cv.graphics, pSize = this.style.pointSize, pColor = this.style.pointColor, lWidth = this.style.lineWidth, lColor = this.style.lineColor, threshold = this.style.threshold;
      this.cv.onDraw = function() {
        var p1 = _this.inPoint, p2 = _this.clampPos(_this.inHandleToComp()), p3 = _this.clampPos(_this.outputHandleToComp()), p4 = _this.outPoint;
        Graphics.drawLine(graph, p1, p2, lWidth, lColor);
        Graphics.drawLine(graph, p4, p3, lWidth, lColor);
        i = 0;
        while (i < 1) {
          Graphics.drawLine(graph, cubicBezier(i, p1, p2, p3, p4), cubicBezier(i + threshold, p1, p2, p3, p4), lWidth, lColor);
          i += threshold;
        }
        Graphics.drawPoint(graph, p2, pSize, pColor);
        Graphics.drawPoint(graph, p3, pSize, pColor);
      };
    };
    Curves.prototype.clampPos = function(pos) {
      return [ clamp(this.pointOffset, pos[0], this.size[0] - this.pointOffset), clamp(this.pointOffset, pos[1], this.size[1] - this.pointOffset) ];
    };
    Curves.prototype.fixOffset = function(y) {
      return y === 0 ? y + this.pointOffset : y - this.pointOffset;
    };
    Curves.prototype.inHandleToComp = function() {
      return [ this.inHandle[0], this.fixOffset(this.inHandle[1]) ];
    };
    Curves.prototype.outputHandleToComp = function() {
      return [ this.outputHandle[0], this.fixOffset(this.outputHandle[1]) ];
    };
    Curves.prototype.hasActive = function(pointPos, mousePos) {
      return pointPos[0] > mousePos[0] - this.pointOffset && pointPos[0] < mousePos[0] + this.pointOffset && pointPos[1] > mousePos[1] - this.pointOffset && pointPos[1] < mousePos[1] + this.pointOffset;
    };
    Curves.prototype.setHandleState = function(val) {
      this.handleState = val;
    };
    Curves.prototype.changeHandleState = function(pos) {
      if (this.hasActive(this.clampPos(this.inHandleToComp()), pos)) {
        this.handleState = 1;
      } else if (this.hasActive(this.clampPos(this.outputHandleToComp()), pos)) {
        this.handleState = 2;
      } else {
        this.handleState = 0;
      }
    };
    Curves.prototype.upDateValue = function(x, y) {
      if (this.handleState === 0) {
        return;
      }
      var _a = this.size, w = _a[0], h = _a[1];
      if (this.handleState === 1) {
        this.value[0] = x / w;
        this.value[1] = 1 - y / h;
      } else if (this.handleState === 2) {
        this.value[2] = 1 - x / w;
        this.value[3] = y / h;
      }
    };
    Curves.prototype.resize = function() {
      this.size = this.cv.size;
      this.inPoint = [ this.pointOffset, this.size[1] - this.pointOffset ];
      this.outPoint = [ this.size[0] - this.pointOffset, this.pointOffset ];
      this.inHandle = [ this.value[0] * this.size[0], this.size[1] - this.value[1] * this.size[1] ];
      this.outputHandle = [ this.size[0] - this.value[2] * this.size[0], this.value[3] * this.size[1] ];
    };
    return Curves;
  }();
  var Main = function() {
    function Main(window) {
      this.window = window;
      this.style = {
        pointSize: 15,
        pointColor: [ 1, 1, 0 ],
        lineWidth: 2,
        lineColor: [ 0.8, 0.8, 0.8 ],
        threshold: 0.04
      };
      {
        var g = window.add('group{orientation:"stack",alignment:["fill","fill"],alignChildren:["fill","fill"]}');
        this.bg = g.add('customview');
        this.view = g.add('customview');
        this.view.size = [ 240, 160 ];
        var dataPreview = window.add('group{alignChildren:["fill","fill"]}');
        dataPreview.add('edittext');
        dataPreview.add('edittext');
        dataPreview.add('edittext');
        dataPreview.add('edittext');
        dataPreview.margins = dataPreview.spacing = 0;
        this.pG = dataPreview.children;
      }
      this.curves = new Curves(this.view, [ 0.222, 0.888, 0.222, 0.888 ], this.style);
      this.watch();
      this.events();
    }
    Main.prototype.events = function() {
      var _this = this;
      this.bg.onDraw = function() {
        Graphics.drawGrid(this.graphics, this.size, 10, 10, [ [ 0.05, 0.05, 0.05 ], 1 ]);
        Graphics.drawRect(this.graphics, this.size.concat([ 0, 0 ]), {
          stroke: {
            width: 2,
            color: [ 0.025, 0.025, 0.025 ]
          }
        });
      };
      var leftClickStatus = false;
      this.view.addEventListener('mousedown', function(e) {
        leftClickStatus = true;
        _this.curves.changeHandleState([ e.clientX, e.clientY ]);
      });
      this.view.addEventListener('mousemove', function(e) {
        if (leftClickStatus) {
          _this.curves.upDateValue(e.clientX | 0, e.clientY | 0);
          _this.view.notify('onDraw');
        }
      });
      this.view.addEventListener('mouseup', function() {
        _this.applyCurve();
        leftClickStatus = false;
        _this.curves.setHandleState(0);
      });
      this.window.onResize = this.window.onResizing = function() {
        _this.curves.resize();
        _this.window.layout.resize();
      };
    };
    Main.prototype.applyCurve = function(val) {
      if (isCompItem(app.project.activeItem) && app.project.activeItem.selectedProperties.length > 0) {
        app.beginUndoGroup('nn_curves');
        setSelectedKeyframeCurve(val || this.curves.value);
        app.endUndoGroup();
      }
    };
    Main.prototype.watch = function() {
      var _this = this;
      forEach(this.pG, function(ele, idx) {
        ele.text = _this.curves.value[idx] + '';
        ele.addEventListener('keydown', function(e) {
          if (e.keyName === 'Enter') {
            _this.curves.value[idx] = +ele.text;
            _this.applyCurve();
            _this.view.notify('onDraw');
          }
        });
      });
      watch2(this.curves.value, 0, function(val) {
        _this.pG[0].text = val.toFixed(3);
        _this.curves.inHandle[0] = val * _this.curves.size[0];
      });
      watch2(this.curves.value, 1, function(val) {
        _this.pG[1].text = val.toFixed(3);
        _this.curves.inHandle[1] = _this.curves.size[1] - val * _this.curves.size[1];
      });
      watch2(this.curves.value, 2, function(val) {
        _this.pG[2].text = val.toFixed(3);
        _this.curves.outputHandle[0] = _this.curves.size[0] - val * _this.curves.size[0];
      });
      watch2(this.curves.value, 3, function(val) {
        _this.pG[3].text = val.toFixed(3);
        _this.curves.outputHandle[1] = val * _this.curves.size[1];
      });
    };
    Main.config = {
      version: '2026',
      name: 'nn_curves'
    };
    return Main;
  }();
  var window = thisObj instanceof Panel ? thisObj : new Window('palette', Main.config.name + '_' + Main.config.version, undefined, {
    resizeable: true
  });
  window.margins = window.spacing = 0;
  window.alignChildren = [ 'fill', 'bottom' ];
  new Main(window);
  if (thisObj === $.global) {
    window.text = Main.config.name;
    window.show();
  }
  layout(window);
}(this);
