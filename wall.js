var topicName;
var topics = {};
var titlePrefix = "MQTT Wall";

var client = new Paho.MQTT.Client(config.server.hostname, config.server.port, "wall" + new Date().getTime());

client.onMessageArrived = onMessage;
client.onconnectionlost = onDisconnect;
client.connect({onSuccess:onConnect});

function onConnect(){
    console.log("mqtt connected");
    load();
}

function onMessage(message) {
	console.log(message);
    printMsg(message.destinationName, message.payloadString, message.retained);
}

function onDisconnect(reason) {
    console.log("disconnected - " + reason);
}

function load()
{
    if (topicName)
    {
        client.unsubscribe(topicName, {
            onSuccess: function(x){console.log(x)}
        });
        console.log(topicName);
        topics = {};
    }

    if (topicName === undefined && location.hash != "")
    {
    	topicName = location.hash.substr(1);
    	$("#topic").val(topicName);
    }
    else
    {
    	topicName = $("#topic").val();
    	location.hash = "#" + topicName;
    }

	document.title = titlePrefix + " for " + topicName;

    client.subscribe(topicName);

    console.info(topicName);

    $("#messages").html("");
}

$("#loadBtn").click(load);

$("#topic").keypress(function(e) {
    if(e.which == 13) {
        load();
    }
});

function printMsg(topic, msg, retained)
{
	var line = topics[topic];

	if (line == undefined) // new message
	{
        line = {};
		line.div = $("<div class='message'>");

    	$("<h2>")
    		.text(topic)
    		.appendTo(line.div);

    	line.msg = $("<p>").appendTo(line.div);
        
    	line.div.appendTo("#messages");
    	topics[topic] = line;
	}

	if(retained)
	{
		line.div.addClass("r")
	}
	else
	{
		line.div.removeClass("r")	
	}

	if (msg == "") 
	{
		msg = "NULL";
		line.msg.addClass("sys");
	}
	else
    {
		line.msg.removeClass("sys");	
	}

	line.msg.text(msg);

	line.msg
    	.stop()
    	.css({backgroundColor: "#0CB0FF"})
    	.animate({backgroundColor: "#fff"}, 2000 );
}
