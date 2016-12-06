var PongGame = (function(){
  // some polyfills
  var requestAnimFrame = window.requestAnimationFrame       ||
                         window.webkitRequestAnimationFrame ||
                         window.mozRequestAnimationFrame    ||
                         function( callback ){ window.setTimeout(callback, 1000 / 60); };

  var cancelAnimFrame = window.cancelAnimationFrame ||
                        window.mozCancelAnimationFrame ||
                        window.clearTimeout;

  var trigger = function(el, name, data){
    var event = new Event(name);
    el.dispatchEvent(event);
  }

  var checkRectCollision = function(a, b){
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.h + a.y > b.y
  }

  var isDown = (function(){
    var keys = { w: false, s: false, up: false, down: false }

    document.addEventListener('keydown', function(e){
      if(e.keyCode == 87){ keys.w = true; }
      else if(e.keyCode == 83){ keys.s = true; }
      else if(e.keyCode == 38){ keys.up = true; }
      else if(e.keyCode == 40){ keys.down = true; }
    });

    document.addEventListener('keyup', function(e){
      if(e.keyCode == 87){ keys.w = false; }
      else if(e.keyCode == 83){ keys.s = false; }
      else if(e.keyCode == 38){ keys.up = false; }
      else if(e.keyCode == 40){ keys.down = false; }
    });

    return function(k){
      return keys[k] || false;
    }
  })();

  /***** Ball *****/
  function Ball(tag, x, y, speed){
    this.tag = tag;
    this.init_x = x || 500;
    this.init_y = y || 300;
    this.w = tag.offsetWidth;
    this.h = tag.offsetHeight;
    this.speed = speed || 5;
    this.reset();
  };

  Ball.prototype.tick = function(){
    if(!this.useCustomBallPostionUpdate){
      this.x += this.dir_x * this.speed;
      this.y += this.dir_y * this.speed;
    }
    this.applyPosition();
  };

  Ball.prototype.resetPosition = function(){
    this.x = this.init_x - this.w/2;
    this.y = this.init_y - this.h/2;
  }

  Ball.prototype.reset = function(){
    this.resetPosition();
    this.dir_x = Math.random() > 0.5 ? 1 : -1;
    this.dir_y = Math.random() > 0.5 ? 1 : -1;
  };

  Ball.prototype.applyPosition = function(){
    this.tag.style.top = this.y + 'px';
    this.tag.style.left = this.x + 'px';
  };

  Ball.prototype.setDirection = function(dx, dy){
    if(dx){
      this.dir_x = dx > 0 ? 1 : -1;
    }
    if(dy){
      this.dir_y = dy > 0 ? 1 : -1;
    }
  }

  /***** Field *****/
  function Field(tag, onBounce){
    this.tag = tag;
    this.w = tag ? tag.offsetWidth : 1000;
    this.h = tag ? tag.offsetHeight : 600;
    this.onBounce = onBounce;
  }

  Field.prototype.containPad = function(pad){
    if(pad.y < 0){ pad.y = 0 }
    else if(pad.y + pad.h > this.h){ pad.y = this.h-pad.h }
  }

  Field.prototype.bounceBall = function(ball){
    if(ball.y < 0){
      if(!this.useCustomBouncing){ ball.dir_y = 1; }
      this.onBounce('top');
    } else if(ball.y + ball.h > this.h){
      if(!this.useCustomBouncing){ ball.dir_y = -1; }
      this.onBounce('bottom');
    }

    if(ball.x < 0){
      if(!this.useCustomBouncing){ ball.dir_x = 1; }
      this.onBounce('left');
    }
    if(ball.x + ball.w > this.w){
      if(!this.useCustomBouncing){ ball.dir_x = -1; }
      this.onBounce('right');
    }
  }

  /***** Pad *****/
  function Pad(tag, x, field, side){
    this.tag = tag;
    this.side = side;
    this.w = tag ? tag.offsetWidth : 20;
    this.h = tag ? tag.offsetHeight : 100;
    this.y = field ? (field.h/2 - this.h/2) : 250;
    this.x = (x || 0) + (side === 'right' ? -this.w-5 : 5);

    this.applyPosition();
  }

  Pad.prototype.applyPosition = function(){
    if(this.tag){
      this.tag.style.top = this.y + 'px';
      this.tag.style.left = this.x + 'px';
      this.tag.style.width = this.w + 'px';
      this.tag.style.height = this.h + 'px';
    }
  }

  Pad.prototype.move = function(dy){
    this.y += dy;
    this.applyPosition();
  }

  /***** Game *****/
  function PongGame(){
    this._tick = _tick.bind(this);
    this._listeners = {};
    this.frame = 0;
  }

  PongGame.prototype.start = function(){
    var game = this;

    this.field = new Field(this.fieldTag, function onBounce(side){
      game.trigger('bounce', side);
    });
    this.ball = new Ball(this.ballTag, this.field.w/2, this.field.h/2, 5);
    this.padLeft = new Pad(this.padLeftTag, 0, this.field, 'left');
    this.padRight = new Pad(this.padRightTag, this.field.w, this.field, 'right');

    // config
    if(this.useCustomBallPostionUpdate){ this.ball.useCustomBallPostionUpdate = true };
    if(this.useCustomBouncing){ this.field.useCustomBouncing = true };

    this.unpause();
    this._tick();
  }

  PongGame.prototype.pause = function(){
    this._paused = true;
  }

  PongGame.prototype.unpause = function(){
    this._paused = false;
  }

  PongGame.prototype.restart = function(){
    this.frame = 0;
  }

  PongGame.prototype.trigger = function(ev_name){
    var args = Array.prototype.slice.call(arguments, 1);
    if(this._listeners[ev_name]){
      this._listeners[ev_name].forEach(function(fn){
        fn.apply(null, args)
      });
    }
  }

  PongGame.prototype.addEventListener = function(ev_name, fn){
    this._listeners[ev_name] = this._listeners[ev_name] || [];
    this._listeners[ev_name].push(fn)
  };

  function _tick(){
    this.frame++;
    this.trigger('tick', this.frame);

    if(!this._paused){
      if(this.useCustomBouncing){
        this.ball.useCustomBouncing = true;
      }
      this.ball.tick();
      this.field.bounceBall(this.ball);

      this.padLeft.applyPosition();
      this.padRight.applyPosition();

      this.field.containPad(this.padLeft);
      this.field.containPad(this.padRight);

      // input
      if(isDown('w')){ this.trigger('keydown', 'w') }
      if(isDown('s')){ this.trigger('keydown', 's') }
      if(isDown('up')){ this.trigger('keydown', 'up') }
      if(isDown('down')){ this.trigger('keydown', 'down') }

      // collisions
      if(checkRectCollision(this.ball, this.padLeft)){
        this.trigger('collision', this.ball, this.padLeft)
      }
      if(checkRectCollision(this.ball, this.padRight)){
        this.trigger('collision', this.ball, this.padRight)
      }
    }

    this._animFrameId = requestAnimFrame(this._tick);
  }

  return PongGame;
})();
