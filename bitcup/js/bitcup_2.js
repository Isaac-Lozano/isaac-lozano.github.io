(function() {
    function get_params() {
        var result = {};
        var pairs = window.location.search.substr(1).split("&");
        for(var i = 0; i < pairs.length; i++) {
            pair = pairs[i].split("=");
            result[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
        }
        return result;
    }

    /* BitCup
     * contains world and bitcup
     * has functions to add bits and clear bits
     * can also solve world hunger
     */
    function BitCup(element, oauth, channel_id) {
        this.engine = Matter.Engine.create();
        this.engine.world.gravity.y = 8;
        this.engine.timing.timeScale = 0.2;
        this.renderer = Matter.Render.create({
            element: element,
            engine: this.engine,
            options: {
                hasBounds: true,
                wireframes: false,
//                showAngleIndicator: true,
            },
        });
//        Matter.Events.on(this.engine, "afterUpdate", this.on_before.bind(this))
        var cup = Matter.Bodies.fromVertices(375, 400, [
            {x: 5, y: 35},
            {x: 35, y: 270},
            {x: 190, y: 270},
            {x: 215, y: 35},
            {x: 220, y: 55},
            {x: 190, y: 280},
            {x: 112, y: 290},
            {x: 35, y: 280},
            {x: 0, y: 55},
        ],
        {
            isStatic: true,
        });
        console.log(cup);
        Matter.World.add(this.engine.world, cup);

        this.listener = new TwitchListener(oauth, channel_id); 
        this.listener.callbacks = [this.on_bit.bind(this)];
    }
    BitCup.prototype = {
        engine: null,
        renderer: null,
        listener: null,
        queue: [], /* Inefficient, but it works cause we won't have many bits at a time */
        run: function() {
            this.run_loop();
            Matter.Render.run(this.renderer);
        },
        run_loop: function() {
            window.requestAnimationFrame(this.run_loop.bind(this));
            Matter.Engine.update(this.engine, 1000 / 60);
        },
        on_before: function(e) {
            var everything = Matter.Composite.allBodies(e.source.world);
            for(var i = 0; i < everything.length; i++) {
                if(everything[i].Velocity < 5) {
                    Matter.Body.setAngularVelocity(everything[i], 0);
                    Matter.Body.setVelocity(everything[i], {x: 0, y: 0});
                    Matter.Sleeping.set(everything[i], true);
                }
            }
        },
        drop_hack: function(x, y) {
            for(var i = 0; i < y; i++) {
                this.queue.push(x);
            }
            this.drop_bit();
        },
        drop_bit: function() {
            if(this.queue.length != 0) {
                var mass = this.queue.shift();
                var img_path = "img/haff.png";
                if(mass >= 100)
                {
                    img_path = "img/rage.png";
                }
                var bit = Matter.Bodies.circle(400, -000, 20, {
                    restitution: 0.88,
                    friction: 0.010,
                    render: {
                        sprite: {
                            texture: img_path,
                        }
                    },
                });
                Matter.Body.setMass(bit, mass);
                Matter.Body.setVelocity(bit, {x: 0.5 * Math.random() - 0.25, y: 5});
                Matter.Body.setAngularVelocity(bit, 0.2 * Math.random() - 0.1);
                console.log(bit);
                Matter.World.add(this.engine.world, bit);
                setTimeout(this.drop_bit.bind(this), 300);
            }
        },
        on_bit: function(data) {
            var restart_drop_bit = false;

            if(this.queue.length == 0) {
                restart_drop_bit = true;
            }

            var reg = new RegExp(/\bcheer\d+\b/g);
            var result;
            while((result = reg.exec(data.chat_message)) != null)
            {
                this.queue.push(parseInt(result[0].substr(5)));
            }

            if(restart_drop_bit) {
                this.drop_bit();
            }
        },
    };

    /* TwitchListener
     * listens to twitch pubsub
     * listens for bits
     * calls callback on bit
     * can create world peace
     */
    function TwitchListener(oauth, channel_id) {
        this.oauth = oauth;
        this.channel_id = channel_id;
        this.socket = new WebSocket("wss://pubsub-edge.twitch.tv");
        this.socket.onmessage = this.on_message.bind(this);
        this.socket.onerror = this.on_error.bind(this);
        this.socket.onopen = this.on_open.bind(this);
        console.log("asdf");
        window.onkeyup = this.on_keyup.bind(this);
    }
    TwitchListener.prototype = {
        oauth: "",
        channel_id: "",
        socket: null,
        callbacks: [],
        on_keyup: function(e) {
            console.log("KADSF");
            switch(e.keyCode) {
                case 49:
                    var data = {
                        user_name: "OnVar",
                        bits_used: 1,
                        chat_message: "cheer1",
                    }
                    for(var i = 0; i < this.callbacks.length; i++) {
                        this.callbacks[i](data)
                    }
                    break;
                case 50:
                    var data = {
                        user_name: "OnVar",
                        bits_used: 10,
                        chat_message: "cheer10",
                    }
                    for(var i = 0; i < this.callbacks.length; i++) {
                        this.callbacks[i](data)
                    }
                    break;
                case 51:
                    var data = {
                        user_name: "OnVar",
                        bits_used: 100,
                        chat_message: "cheer100",
                    }
                    for(var i = 0; i < this.callbacks.length; i++) {
                        this.callbacks[i](data)
                    }
                    break;
            }
        },
        on_message: function(e) {
            var obj = JSON.parse(e.data);
            switch(obj.type) {
                case "PONG":
                    //console.log("Got Pong");
                    break;
                case "RESPONSE":
                    if(obj.error == "")
                    {
                        console.log("Subscribed for topic with no errors");
                    }
                    else
                    {
                        console.log("Error: " + obj.error);
                    }
                    break;
                case "MESSAGE":
                    /* Ew */
                    var data = JSON.parse(obj.data.message);
                    console.log(data.user_name + " cheered with " + data.bits_used + " bits: " + data.chat_message);
                    for(var i = 0; i < this.callbacks.length; i++) {
                        this.callbacks[i](data)
                    }
                    break;
                default:
                    console.log("Unknown: " + e.data);
            }
        },
        on_error: function(e) {
            console.log(e);
        },
        on_open: function(e) {
            setInterval(function() {
                this.socket.send(JSON.stringify({
                    type: "PING"
                }));
            }.bind(this), 6000);
            this.socket.send(JSON.stringify({
                type: "LISTEN",
                nonce: "OnVar is so cool.",
                data: {
                    topics: ["channel-bitsevents." + this.channel_id],
                    auth_token: this.oauth,
                }
            }));
        },
    };
//    TwitchListener.prototype.on_message = function(e) { console.log(e); };

    window.onload = function() {
        var params = get_params();
        /*var*/ cup = new BitCup(document.body, params.oauth, params.channel_id);
        cup.run();
    }
})();
