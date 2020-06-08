$(document).ready(function(){

    var searchParams = new URLSearchParams(window.location.search);
    Saved = parseInt(searchParams.get("saved"));
    if(Saved == 1) {
        M.toast({html: "Sequence saved."});
    }

    Load();
    setInterval(GetStatus, 1500);

});


//  Load sequences
function Load() {

    $.ajax({
		type: "GET",
		url: "/load_sequences",
		cache: false
	}).done(function(data) {
        $("#SequenceList").empty();
        for (var seq in data) {
            var panel = "<div class='card-panel' style='padding: 2px;' id='Panel_" + seq + "'>";
            panel += "    <div class = 'row'> <div class='col s12'><h6><b>" + data[seq] + "</b></h6></div></div>";
            panel += "    <div class = 'row'>";
            panel += "        <div class='col s3 center-align'><a onClick='PlaySequence(" + seq + ");' id='btnPlaySequence_" + seq + "' class='play-btn z-depth-2 blue lighten-2 waves-effect waves-light btn-floating'><i class='material-icons'>play_arrow</i></a></div>";
            panel += "        <div class='col s3 center-align'><a onClick='EditSequence(" + seq + ");' id='btnEditSequence_" + seq + "' class='edit-btn z-depth-2 blue lighten-2 waves-effect waves-light btn-floating'><i class='material-icons'>create</i></a></div>";
            panel += "        <div class='col s3 center-align'><a onClick='DuplicateSequence(" + seq + ");' id='btnDuplicateSequence_" + seq + "' class='z-depth-2 blue lighten-2 waves-effect waves-light btn-floating'><i class='material-icons'>content_copy</i></a></div>";
            panel += "        <div class='col s3 center-align'><a onClick='DeleteSequence(" + seq + ");' id='btnDeleteSequence_" + seq + "' class='delete-btn z-depth-2 blue lighten-2 waves-effect waves-light btn-floating'><i class='material-icons'>delete</i></a></div>";
            panel += "    </div>";
            panel += "</div>";
            $("#SequenceList").append(panel);
        }
        GetStatus();
	}, "json");

}


//  Go to execute page of sequence
function PlaySequence(id) {

    location.replace("execute_sequence.html?id=" + id);

}


//  Create or edit a sequence
function EditSequence(id) {

    location.replace("edit_sequence.html?id=" + id);

}


//  Delete sequence and relative steps
function DeleteSequence(id) {

    if(confirm("Entire sequence will be deleted, continue?")) {
        $.ajax({
            type: "POST",
            url: "/delete_sequence",
            data : {
                ID : id
            },
            cache: false
        }).done(function(data) {
            $("#Panel_" + id).remove();
            M.toast({html: "Sequence deleted."});
        });
    }

}


//  Duplicate sequence
function DuplicateSequence(id) {

    $.ajax({
        type: "POST",
        url: "/duplicate_sequence",
        data : {
            ID : id
        },
        cache: false
    }).done(function(data) {
        Load();
        M.toast({html: "Sequence duplicated."});
    });

}


//  Get system status
function GetStatus() {

    $.ajax({
        type: "GET",
        url: "/get_status",
        cache: false
    }).done(function(data) {
        if(data["SequenceID"] != null && !$("#btnEditSequence_"+data["SequenceID"]).hasClass("disabled")) {
            $(".play-btn").addClass("disabled");
            $("#btnPlaySequence_"+data["SequenceID"]).removeClass("disabled");
            $("#btnEditSequence_"+data["SequenceID"]).addClass("disabled");
            $("#btnDeleteSequence_"+data["SequenceID"]).addClass("disabled");
        } else if(data["SequenceID"] == null && $(".play-btn").hasClass("disabled")) {
            $(".play-btn").removeClass("disabled");
            $(".edit-btn").removeClass("disabled");
            $(".delete-btn").removeClass("disabled");
        }
    }, "json");

}