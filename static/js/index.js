$(document).ready(function(){

    GetStatus();
    setInterval(GetStatus, 1000);

});

var TimerBounce = null;
var BounceUp = true;
var BounceValue;

//  Get system status
function GetStatus() {

    $.ajax({
        type: "GET",
        url: "/get_status",
        cache: false
    }).done(function(data) {
        if(data["SequenceID"] != null && $.trim($("#CurrentSequence").html()) == "") {
            var panel = "<a id='GoToSequence' href = 'execute_sequence.html?id=" + data["SequenceID"] + "' style='width: 30%;' class='z-depth-1 green lighten-2 waves-effect waves-light btn-large'><i class='material-icons'>warning</i></a>";
            $("#CurrentSequence").html(panel);
            BounceValue = 1;
            BounceUp = true;
            TimerBounce = setInterval(Bounce, 200);
        } else if(data["SequenceID"] == null && $.trim($("#CurrentSequence").html()) != "") {
            $("#CurrentSequence").empty();
            clearInterval(TimerBounce);
            TimerBounce = null;
        }
    }, "json");

}


//  Add bounce effect to current executing sequence button
function Bounce() {

    if(TimerBounce != null) {
        var NewValue = BounceValue;
        if(BounceUp) {
            NewValue += 1;
            if(NewValue >= 5) {
                BounceUp = false;
                NewValue = 3;
            }
        } else {
            NewValue -= 1;
            if(NewValue <= 0) {
                BounceUp = true;
                NewValue = 2;
            }
        }
        $("#GoToSequence").addClass("z-depth-"+NewValue);
        $("#GoToSequence").removeClass("z-depth-"+BounceValue);
        BounceValue = NewValue;
    }

}




//  Shutdown
function Shutdown() {
    
    $.ajax({
        type: "POST",
        url: "/shutdown",
        cache: false
    });
    M.toast({html: "Bye!"});
    
}