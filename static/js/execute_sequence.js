$(document).ready(function(){

    var searchParams = new URLSearchParams(window.location.search);
    SequenceID = parseInt(searchParams.get("id"));
    if(!isNaN(SequenceID)) {
        Load();
        setInterval(GetStatus, 700);
    } else {
        location.replace("/");
    }

});


var SequenceID = -1;
var Motor = "SliderMotor";
Stop = false;


//  Load sequence
function Load() {

    $.ajax({
        type: "POST",
        url: "/load_sequence",
        data : {
            SequenceID: SequenceID
        },
        cache: false
    }).done(function(data) {
        $("#StepList").empty();
        $("#SequenceName").html("<h5><b>" + data["Name"] + "</b></h5>");
        for (var step in data["Steps"]) {
            var panel = "<div class='step card-panel' style='padding: 2px;' id='Step_" + data["Steps"][step]["Row"] + "'>";
            panel += "    <div class='row valign-wrapper' style='margin-bottom: 2px;'>";
            panel += "        <div class='col s2'><h3><b>" + data["Steps"][step]["Row"] + "</b></h3></div>";
            panel += "        <div class='col s8 center-align'><h6><b>" + GetStepDescription(data["Steps"][step]) + "</b></h6></div>";
            panel += "        <div class='col s2 center-align'><br></div>";
            panel += "    </div>";
            panel += "</div>";
            $("#StepList").append(panel);
            GetStatus();
        }
    }, "json");

}


function GetStepDescription(step) {

    switch(step["Type"]) {
        case 0:
            return "Wait " + FormatTime(step["Params"]["Seconds"]);
        break;
        case 1:
            return "Go to " + step["Params"]["Position"] / 10 + " cm in " + FormatTime(step["Params"]["Seconds"]);
        break;
        default:
            return "";
        break;
    }

}


function FormatTime(sec) {

    if (sec >= 0 && sec <= 59) {
        return sec + " seconds."
    } else if(sec >= 60 && sec <= 3540) {
        return (sec / 60) + " minutes."
    } else {
        return (sec / 3600) + " hours."
    }

}


//  Get system status
function GetStatus() {

    $.ajax({
        type: "GET",
        url: "/get_status",
        cache: false
    }).done(function(data) {
        //  Set btnExecuteStop
        if(   ((data["Status"] == 1 && data["CurrentRow"] == 2) || data["Status"] == 3) && $("#btnExecuteStop").hasClass("green")) {
            $("#btnExecuteStop").html("<i class='material-icons left'>stop</i>Stop");
            $("#btnExecuteStop").removeClass("green");
            $("#btnExecuteStop").addClass("red");
            Stop = true;
        } else if( data["Status"] == 0  && $("#btnExecuteStop").hasClass("red")) {
            $("#btnExecuteStop").html("<i class='material-icons left'>play_arrow</i>Execute");
            $("#btnExecuteStop").removeClass("red");
            $("#btnExecuteStop").addClass("green");
            Stop = false;
        }
        //  Mark current step if sequence executing
        $(".step").removeClass("green lighten-3");
        if(  ((data["Status"] == 1 && data["CurrentRow"] == 2) || data["Status"] == 3) && !$("#Step_" + data["CurrentRow"]).hasClass("green lighten-3")) {
            $("#Step_" + data["CurrentRow"]).addClass("green lighten-3");
        }
    }, "json");

}


//  Execute or stop sequence
function ExecuteStop() {

    $.ajax({
        type: "POST",
        url: "/execute_stop",
        data : {
            SequenceID: SequenceID,
            Stop: Stop
        },
        cache: false
    }).done(function(data) {
        if($.trim(data) == "") {
            GetStatus();
        } else {
            if(Stop) {
                M.toast({html: "Error on stopping."});
            } else {
                M.toast({html: "Error on executing."});
            }
        }
    });

}