
class Vector2d  {
  static SQ_EPSILON = 0.0001*0.0001;
  constructor(/** number */ x=0, /** number */ y=0) {
    this.x = x;
    this.y = y;
  }

  /** number */ dotProduct(/** !Vector2d */ other) {
    return this.x*other.x + this.y*other.y;
  }
  /** number */ getLength() { return Math.sqrt(this.dotProduct(this)); }
  /** number */ getLength2() { return this.dotProduct(this); }

  /** !Vector2d */ multThis(/** number */ scalar) {
    this.x *= scalar;
    this.y *= scalar;

    return this;
  }

  /** !Vector2d */ addThis(/** !Vector2d */  other) {
    this.x += other.x;
    this.y += other.y;

    return this;
  }

  /** !Vector2d */ mult(/** number */ scalar) {
    return new Vector2d(this.x*scalar, this.y*scalar);
  }

  /** !Vector2d */ add(/** !Vector2d */  other) {
    return new Vector2d(this.x+other.x, this.y+other.y);
  }

  /** !Vector2d */ normalize() {
    let s = this.getLength2();
    if (s < Vector2d.SQ_EPSILON) {
      this.x = this.y = 0;
      return this;
    }
    s = 1/Math.sqrt(s);
    this.multThis(s);

    return this;
  }
}

class DekaInput {
  constructor() {
    this.mouseX = this.mouseY = 0;
    this.pressed = false;
    this.pressX = this.pressY = 0;
  }

  mouseMoved(/** !MouseEvent */ e) {
    this.mouseX = e.offsetX;
    this.mouseY = e.offsetY;
  }

  mousePressed(/** !MouseEvent */ e) {
    this.pressX = e.offsetX;
    this.pressY = e.offsetY;
    this.pressed = true;
  }

  /** boolean */ getPressed() {
    if (this.pressed) {
      this.pressed = false;
      return true;
    } else {
      return false;
    }
  }

  attachTo(/** !EventTarget */ element) {
    element.addEventListener("pointermove", this.mouseMoved.bind(this));
    element.addEventListener("pointerdown", this.mousePressed.bind(this));
  }
}

function prepareImage(fn) {
  let img = document.createElement("img");
  img.src = fn;
  return img;
}

function loadImage(fn) {
  return new Promise((resolve, reject) => {
    let img = prepareImage(fn);
    img.addEventListener("load", _ => {
      resolve(img);
    });
    img.addEventListener("error", e => {
      reject(e);
    });
  });
}

class Ball
{
  static ballPic = prepareImage("ball.png");
  static bx = 0;
  static by = 0;

  static async init() {
    if (!Ball.ballPic.naturalWidth) {
      await new Promise((resolve, reject) => {
        Ball.ballPic.addEventListener("load", _ => {
          resolve(Ball.ballPic);
        });
        Ball.ballPic.addEventListener("error", e => {
          reject(e);
        });
      });
    }
    Ball.bx = Ball.ballPic.naturalWidth / 2;
    Ball.by = Ball.ballPic.naturalHeight / 2;
  }

  constructor(/** !Deka */ deka, /** Ball */ next = null) {
    this.knee = this.bottom = this.left = this.right = false;
    this.r = new Vector2d(deka.getSpaceWidth()/2, -Ball.by);
    this.v = new Vector2d();
    this.nextBall = next;
    this.timescale = 1;
    this.bounces = 0;
    this.maxBounces = 0;
    this.deka = deka;
  }

  setTimeScale(/** number */ ts) {
    this.timescale = ts;
    if (this.nextBall)
      this.nextBall.setTimeScale(ts);
  }

  draw(/** CanvasRenderingContext2D */ g) {
    g.drawImage(Ball.ballPic, this.r.x-Ball.bx, this.r.y-Ball.by);
  }

  drawRecursive(/** CanvasRenderingContext2D */ g) {
    this.draw(g);
    if (this.nextBall)
      this.nextBall.drawRecursive(g);
  }

  update(/** DekaInput */ i) {
    let mx = i.mouseX, my = i.mouseY;

    let /** !Vector2d */ d = new Vector2d(mx, my).add(this.r.mult(-1.0));
    if (d.getLength() < Ball.bx) {
      d.y += Ball.bx;
      d.multThis(-1.0/32.0);
      d.x *= 8.0;
      this.v.addThis(d);
      if (this.v.y > 0) this.v.y = -this.v.y;
      if (!this.knee) {
        this.bounces++;
        if (this.bounces > this.maxBounces) this.maxBounces = this.bounces;
        this.knee = true;
      }
    } else {
      this.knee = false;
    }

    let /** !Vector2d */ delta = this.v.mult(this.timescale);

    if (this.r.y + delta.y + Ball.by > this.deka.getSpaceHeight()) {
      this.bounces = 0;
      this.v.y = -Math.abs(this.v.y);
      delta.y = -Math.abs(delta.y);
      if (!this.bottom) {
        this.v.y *= 0.9;
        delta.y *= 0.9;
        this.bottom = true;
      }
    } else {
      this.bottom = false;
    }

    if (this.r.x + delta.x - Ball.bx < 0) {
      this.v.x = Math.abs(this.v.x);
      delta.x = Math.abs(delta.x);
      if (!this.left) {
        this.v.x *= 0.9;
        delta.x *= 0.9;
        this.left = true;
      }
    } else {
      this.left = false;
    }

    if (this.r.x + delta.x + Ball.bx > this.deka.getSpaceWidth()) {
      this.v.x = -Math.abs(this.v.x);
      delta.x = -Math.abs(delta.x);
      if (!this.right) {
        this.v.x *= 0.9;
        delta.x *= 0.9;
        this.right = true;
      } else {
        this.right = false;
      }
    }

    this.r.addThis(delta);
    this.v.multThis(Math.pow(1.0-1e-3, this.timescale));
    this.v.y += 0.3*this.timescale;
  }

  updateRecursive(/** !DekaInput */ i) {
    this.update(i);
    if (this.nextBall)
      this.nextBall.updateRecursive(i);
  }
}

class Deka {
  draw(/** !CanvasRenderingContext2D */ g) {
    g.fillStyle = "yellow";
    this.drawBackground(g);
    g.fillRect(0, this.getSpaceHeight(), this.getWidth()*this.first.timescale/2, this.getHeight()-this.getSpaceHeight());
    this.first.drawRecursive(g);

    g.font = "sans-serif bold 16px";
    g.fillStyle = "red";
    g.fillText("Bounces: "+this.first.bounces+" (record: "+this.first.maxBounces+")", 4, 16);
  }

  frame() {
    this.draw(this.context);
    this.first.updateRecursive(this.input);
    if (this.input.getPressed()) {
      if (this.input.pressY > this.getSpaceHeight())
        this.first.setTimeScale(this.input.pressX/this.getWidth()*2);
    }
    requestAnimationFrame(this.frame.bind(this));
  }

  drawBackground(/** !CanvasRenderingContext2D */ g) {
    let scale = Math.max(g.canvas.width / this.background.naturalWidth, g.canvas.height / this.background.naturalHeight)
    let ow = this.background.naturalWidth * scale;
    let oh = this.background.naturalHeight * scale;
    let ox = (g.canvas.width - ow)/2;
    let oy = (g.canvas.height - oh)/2;
    g.drawImage(this.background, ox, oy, ow, oh);
  }

  static async create(/** !HTMLCanvasElement */ canvas) {
    return new Deka().init(canvas);
  }

  constructor() {
    this.input = null;
    this.background = null;
    this.first = null;
    this.canvas = null;
  }

  async init(canvas) {
    this.canvas = canvas;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // if (screen.orientation.type.startsWith("portrait")) {
    //   [this.canvas.width, this.canvas.height] = [this.canvas.height, this.canvas.width];
    // }
    this.context = canvas.getContext("2d");

    this.input = new DekaInput();
    this.input.attachTo(canvas);

    this.background = await loadImage("pexels-jonathan-petersson-399187.jpg");
    await Ball.init(this);
    this.first = new Ball(this);
    this.frame();
    return this;
  }

  getWidth() {
    return this.canvas.width;
  }

  getHeight() {
    return this.canvas.height;
  }

  /** number */ getSpaceHeight() {
    return this.getHeight()-16;
  }

  /** number */ getSpaceWidth() {
    return this.getWidth();
  }
}

Deka.create(document.querySelector("canvas"));
