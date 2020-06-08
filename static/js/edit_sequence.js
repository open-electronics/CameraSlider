$(document).ready(function(){

    var searchParams = new URLSearchParams(window.location.search);
    SequenceID = parseInt(searchParams.get("id"));

    Load();

    setInterval(CheckForSave, 1000);
    
    InitModal();

});



var SequenceID = -1;
var Sequence;
var Motor = "SliderMotor";

var MustSave = false;


//  Check if save is needed when exit
function CheckForSave() {

    //  Update Back&Save button
    if($.trim($("#StepList").html()) != "" || $.trim($("#Name").val()) != "" || SequenceID != -1) {
        $("#btnBackSave").html("<i class='material-icons'>arrow_back</i> &nbsp; <i class='material-icons'>save</i>");
        MustSave = true;
    } else {
        $("#btnBackSave").html("<i class='material-icons'>arrow_back</i>");
        MustSave = false;
    }

}


//  Init modal and form controls
function InitModal() {

    $(".modal").modal();
    for(var i=1; i<60; i++) {
        $("#Seconds_0").append($("<option>", {value: i, text: i+"s"}));
    }
    for(var i=1; i<60; i++) {
        $("#Seconds_0").append($("<option>", {value: i*60, text: i+"m"}));
    }
    for(var i=1; i<6; i++) {
        $("#Seconds_0").append($("<option>", {value: i*3600, text: i+"h"}));
    }
    UpdateTravelSeconds();
    $.ajax({
        type: "GET",
        url: "/load_settings",
        cache: false
    }).done(function(data) {
        for(var i=0; i<=parseInt(data["SliderLength"]) / 10; i++) {
            $("#Position_1").append($("<option>", {value: i, text: i+"cm"}));
        }
    }, "json");

}


//  Update Seconds in Goto step type for min/max speed
function UpdateTravelSeconds() {

    var LastPosition = GetLastPosition(parseInt($("#Pos").val()));              //  mm
    var DesiredPosition = parseInt($("#Position_1").val()) * 10;                 //  mm
    var MinSpeed = 1;        //  mm/s
    var MaxSpeed = 200;      //  mm/s
    var Speed = 0;           //  mm/s
    var Travel = Math.abs(LastPosition - DesiredPosition) ;

    $("#Seconds_1").empty();

    for(var i=1; i<60; i++) {
        Speed = Travel / i;
        if( Speed >= MinSpeed && Speed <= MaxSpeed ) {
            $("#Seconds_1").append($("<option>", {value: i, text: i+" sec.        (" + parseInt(Speed).toString() + " mm/s)"}));
        }
    }
    for(var i=1; i<60; i++) {
        Speed = Travel / (i*60);
        if( Speed >= MinSpeed && Speed <= MaxSpeed ) {
            $("#Seconds_1").append($("<option>", {value: i*60, text: i+" min.        (" + parseInt(Speed).toString() + " mm/s)"}));
        }
    }

}


//  Load sequence
function Load() {

    if(SequenceID != -1) {

        $.ajax({
            type: "POST",
            url: "/load_sequence",
            data : {
                SequenceID: SequenceID
            },
            cache: false
        }).done(function(data) {
            Sequence = data;
            $("#StepList").empty();
            $("#Name").val(data["Name"]);
            for (var step in data["Steps"]) {
                var panel = "<div class='card-panel' style='padding: 2px;' id='Step_" + data["Steps"][step]["ID"] + "'>";
                panel += "    <div class='row valign-wrapper' style='margin-bottom: 2px;'>";
                panel += "        <div class='col s2'><h3><b>" + data["Steps"][step]["Row"] + "</b></h3></div>";
                panel += "        <div class='col s8 center-align'><h6><b>" + GetStepDescription(data["Steps"][step]) + "</b></h6></div>";
                panel += "        <div class='col s2 center-align'><a onClick='DeleteStep(" + data["Steps"][step]["ID"] + ", " + data["Steps"][step]["Row"] + ");' id='btnDeleteStep_" + data["Steps"][step]["ID"] + "' class='z-depth-2 blue lighten-2 waves-effect waves-light btn-floating'><i class='material-icons'>delete</i></a></div>";
                panel += "    </div>";
                panel += "</div>";
                panel += "<div class = 'row' id='Add_" + data["Steps"][step]["Row"] + "'>";
                panel += "    <div class='col s12 center-align'>";
                panel += "        <a onClick='AddStep(" + data["Steps"][step]["Row"] + ");' id='btnAdd_" + data["Steps"][step]["Row"] + "' class='z-depth-2 blue lighten-2 waves-effect waves-light btn-floating'><i class='material-icons'>add_circle</i></a>";
                panel += "    </div>";
                panel += "</div>";
                $("#StepList").append(panel);
            }
            CheckForSave();
        }, "json");

    }

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


//  Add step
function AddStep(pos) {

    $("#Pos").val(pos);
    $("#StepType").prop("selectedIndex", 0);
    $("#Seconds_0").prop("selectedIndex", 0);
    $("#Seconds_1").prop("selectedIndex", 0);
    $("#Position_1").prop("selectedIndex", 0);
    ChangeStepType();
    UpdateTravelSeconds();
    $("#ModalAddStep").modal("open");

}


//  Save step
function SaveStep() {

    if(SequenceID == -1) {
        SaveSequence();
    }

    var StepType = parseInt($("#StepType").val());
    var Data = {};
    switch(StepType) {
        case 0:
            Data = {
                SequenceID: SequenceID,
                Motor: Motor,
                Row: parseInt($("#Pos").val()) + 1,
                Type: StepType,
                Seconds: parseInt($("#Seconds_0").val())
            }
        break;
        case 1:
            Data = {
                SequenceID: SequenceID,
                Motor: Motor,
                Row: parseInt($("#Pos").val()) + 1,
                Type: StepType,
                Position: parseInt($("#Position_1").val()),
                Seconds: parseInt($("#Seconds_1").val())
            }
        break;
    }    

    //  Check if Seconds is not null in GoTo step
    if (StepType == 1 && isNaN(Data["Seconds"])) {
        return;
    }

    $.ajax({
        type: "POST",
        url: "/save_step",
        data : Data,
        cache: false
    }).done(function(data) {
        Load();
        CloseStep();
    });

}


//  Get last step position from previous steps
function GetLastPosition(index) {

    if(index == 0) {
        return 0;
    } else {
        index--;
        if (Sequence["Steps"][index+1]["Type"] == 1) {
            return Sequence["Steps"][index+1]["Params"]["Position"];
        } else {
            return GetLastPosition(index);
        }
    }

}


//  Close step modal
function CloseStep() {

    $("#ModalAddStep").modal("close");

}


//  Change step type
function ChangeStepType() {

    switch(parseInt($("#StepType").val())) {
        case 0:
            $("#Type_1").hide();
            $("#Type_0").show();
        break;
        case 1:
            $("#Type_0").hide();
            $("#Type_1").show();
        break;
    }

}


//  Delete step
function DeleteStep(id, pos) {

    $.ajax({
        type: "POST",
        url: "/delete_step",
        data : {
            SequenceID: SequenceID,
            ID: id,
            Position: pos
        },
        cache: false
    }).done(function(data) {
        Load();
        M.toast({html: "Step deleted."});
    });

}


//  Save sequence and return SequenceID
function SaveSequence(exit = false) {

    $.ajax({
        type: "POST",
        url: "/save_sequence",
        data : {
            SequenceID: SequenceID,
            Name: $("#Name").val()
        },
        async:false,
        cache: false
    }).done(function(data) {
        SequenceID = parseInt(data);
        if(exit) {
            location.replace("sequences.html?saved=1");
        }
    });

}


//  Back and eventually save sequence
function BackSave() {

    if(MustSave) {
        SaveSequence(true);
    } else {
        location.replace("sequences.html");
    }

}