'use strict';
var PongGame = (function() {
    var requestAnimFrame = window.requestAnimationFrame ||
                                window.webkitRequestAnimationFrame ||
                                window.mozRequestAnimationFrame ||
                                function requestAnimFrame(callback){ window.setTimeout(callback, 1000 / 60); };

    var cancelAnimFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame || window.clearTimeout;

    function checkOverlap(t1, t2) {
        if(!t1 || !t2) {
            return false;
        }

        var r1 = t1.getBoundingClientRect();
        var r2 = t2.getBoundingClientRect();
        return !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
    };

    function clamp(min, n, max) {
        return Math.min(Math.max(n, min), max);
    }

    var triggerKeysDown = (function triggerKeysDownPrep() {
        var keys = {};
        var defs = {left: 37, up: 38, right: 39, down: 40, w: 87, d: 68, a: 65, s: 83};

        function isDown(num)
        {
            return keys[num] || false;
        }

        document.addEventListener('keydown', function(e){ keys[e.keyCode] = true; });
        document.addEventListener('keyup', function(e){ keys[e.keyCode] = false; });

        return function triggerKeysDown(game)
        {
            Object.keys(defs).forEach(function(k)
            {
                if(isDown(defs[k]))
                {
                    game._trigger('keydown', k);
                }
            });
        };
    })();

    function _playerMoveUp(ydist) {
        var new_top = 0;

        if(this == g_game.playerLeft) {
            g_game._pl_y = clamp(5, g_game._pl_y - ydist, g_game._field_h - 5 - this.offsetHeight);
            new_top = g_game._pl_y;
        }
        else if(this == g_game.playerRight) {
            g_game._pr_y = clamp(5, g_game._pr_y - ydist, g_game._field_h - 5 - this.offsetHeight);
            new_top = g_game._pr_y;
        }

        if(new_top < 5) {
            new_top = 5;
        }

        this.style.top = parseInt(new_top) + 'px';
    }

    function _playerMoveDown(ydist) {
        _playerMoveUp.call(this, -ydist);
    }

    function _ballSetDirection(xdir) {
        xdir = xdir < 0 ? -1 : 1;
        g_game._ball_dir_x = xdir;
    }

    var g_game;

    function PongGame(ball, field, playerLeft, playerRight) {
        g_game           = this;
        this.ball        = ball;
        this.field       = field;
        this.playerLeft  = playerLeft;
        this.playerRight = playerRight;

        this._pl_y       = 0;
        this._pr_y       = 0;
        this._field_h    = field ? field.offsetHeight : 500;
        this._field_w    = field ? field.offsetWidth : 800;
        this._listeners  = {};

        if(!this.ball) {
            alert("ERROR: you muse specify game.ball!");
            return;
        }

        ball.setDirection   = _ballSetDirection;
        ball.resetPosition  = this._reset.bind(this);
        ball.setSpeed = function setSpeed(val) {
            g_game.speed = parseInt(val);
        };

        if(this.field) {
            if(this.playerLeft) {
                this.playerLeft.moveUp = _playerMoveUp;
                this.playerLeft.moveDown = _playerMoveDown;
                this._pl_y = (this.field.offsetHeight/2 - this.playerLeft.offsetHeight/2);
                this.playerLeft.moveUp(0);
            }

            if(this.playerRight) {
                this.playerRight.moveUp = _playerMoveUp;
                this.playerRight.moveDown = _playerMoveDown;
                this._pr_y = (this.field.offsetHeight/2 - this.playerRight.offsetHeight/2);
                this.playerRight.moveUp(0);
            }
        }

        this._reset();
        this._tick();
    }

    PongGame.prototype._bounceBall = function() {
        var bw = this._ball_w;
        var bh = this._ball_h;
        var bx = this._ball_x;
        var by = this._ball_y;

        if(by < 0) {
            this._ball_dir_y = 1;
            g_game._trigger('bounce', 'top');
        }
        else if(by + bh > this._field_h) {
            this._ball_dir_y = -1;
            g_game._trigger('bounce', 'bottom');
        }

        if(bx < 0) {
            this._ball_dir_x = 1;
            g_game._trigger('bounce', 'left');
            g_game._reset();
        }
        else if(bx + bw > this._field_w) {
            this._ball_dir_x = -1;
            g_game._trigger('bounce', 'right');
            g_game._reset();
        }
    }

    PongGame.prototype._updateBall = function() {
        if(this.ball) {
            var speed = this.speed || 4;
            this._ball_x = this._ball_x + this._ball_dir_x * speed;
            this._ball_y = this._ball_y + this._ball_dir_y * speed;

            this.ball.style.left = this._ball_x + 'px';
            this.ball.style.top = this._ball_y + 'px';
        }
    };

    PongGame.prototype.addEventListener = function(ev_name, fn) {
        this._listeners[ev_name] = this._listeners[ev_name] || [];
        this._listeners[ev_name].push(fn);
    };

    PongGame.prototype._trigger = function(ev_name) {
        var args = Array.prototype.slice.call(arguments, 1);

        if(this._listeners[ev_name]) {
            this._listeners[ev_name].forEach(function(fn) {
                fn.apply(null, args);
            });
        }
    };

    PongGame.prototype._tick = function() {
        this._bounceBall();
        this._updateBall();

        triggerKeysDown(this);

        if(checkOverlap(this.ball, this.playerLeft)) {
            this._trigger('collision', this.playerLeft);
        }

        if(checkOverlap(this.ball, this.playerRight)) {
            this._trigger('collision', this.playerRight);
        }

        this._animFrameId = requestAnimFrame(this._tick.bind(this));
    };

    PongGame.prototype._reset = function() {
        this._ball_x = 0;
        this._ball_y = 0;
        this._ball_dir_y = this._ball_dir_y || 1;
        this._ball_dir_x = this._ball_dir_x || 1;
        this._ball_w = this.ball.offsetWidth;
        this._ball_h = this.ball.offsetHeight;

        if(this.field) {
            this._field_w = this.field.offsetWidth;
            this._field_h = this.field.offsetHeight;

            this._ball_x = this._field_w / 2 - this.ball.offsetWidth / 2;
            this._ball_y = this._field_h / 2 - this.ball.offsetHeight / 2;
        }
    };

    return PongGame;
})();
