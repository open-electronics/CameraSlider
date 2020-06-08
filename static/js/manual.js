$(document).ready(function(){

    UpdateSpeed(100);
    GetStatus();
    setInterval(GetStatus, 700);

});

var Speed = 0;

//  Get system status
function GetStatus() {

    $.ajax({
        type: "GET",
        url: "/get_status",
        cache: false
    }).done(function(data) {
        //  Move and stop buttons
        if(data["Free"] == false && data["SequenceID"] != null && !$("#btnSliderHome").hasClass("disabled")) {
            $("#btnSliderHome").addClass("disabled");
            $("#btnSliderBack").addClass("disabled");
            $("#btnSliderForward").addClass("disabled");
            $("#btnStop").addClass("disabled");
        } else if(data["SequenceID"] == null && $("#btnSliderHome").hasClass("disabled")) {
            $("#btnSliderHome").removeClass("disabled");
            $("#btnSliderBack").removeClass("disabled");
            $("#btnSliderForward").removeClass("disabled");
            $("#btnStop").removeClass("disabled");
        }
        $("#Position").css("width", data["Position"]+"%");
    }, "json");

}


//  Move back or forward or GoHome
function Move(dir) {

    $.ajax({
        type: "POST",
        url: "/move",
        data : {
            Direction: dir,
            Speed: Speed
        },
        cache: false
    }).done(function(data) {

    });

}


//  Stops every manual movement except GoHome
function Stop() {

    $.ajax({
        type: "POST",
        url: "/stop",
        cache: false
    }).done(function(data) {

    });

}


//  Update slider speed
function UpdateSpeed(s, move = 0) {

    Speed = s;
    $("#Speed").html("Speed (" + Speed + "mm/s):");
    if (move == 1) {
        $.ajax({
            type: "POST",
            url: "/update_speed",
            data : {
                Speed: Speed
            },
            cache: false
        }).done(function(data) {
    
        });
    }

}