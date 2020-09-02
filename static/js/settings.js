$(document).ready(function(){
    Load();
});


//  Load settings
function Load() {

    $.ajax({
		type: "GET",
		url: "/load_settings",
		cache: false
	}).done(function(data) {
        $("#SliderLength").val(data["SliderLength"]);
	}, "json");

}


//  Save settings and reboot
function SaveAndReboot() {

    $.ajax({
		type: "POST",
        url: "/save_settings",
        data : {
            SliderLength : $("#SliderLength").val()
		},
		cache: false
	}).done(function(data) {
        if($.trim(data) == "" || data == null) {
            M.toast({html: "Saved: rebooting..."});
        } else {
            M.toast({html: data});
        }
	});

}


//  Export settings and sequences
function Export() {

    $.ajax({
		type: "GET",
		url: "/export",
		cache: false
	}).done(function(data) {
        if($.trim(data) == "") {
            var link = document.createElement('a');
            link.href = "static/data/export.json";
            link.download = "export.json";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            M.toast({html: data});
        }
	});

}


//  Import settings and sequences
function Import() {
			
    var files = document.getElementById("ImportFile").files;
    if (files.length <= 0) {
        return false;
    }
    var fr = new FileReader();
    fr.onload = function(e) { 
        var result = JSON.parse(e.target.result);
        var data = JSON.stringify(result);
        if(confirm("All your sequences and settings will be overwritten, continue?")) {
            $.ajax({
                type: "POST",
                url: "/import",
                data : {
                    Import: data
                },
                cache: false
            }).done(function(data) {
                if($.trim(data) == "") {
                    M.toast({html: "Imported, rebooting..."});
                } else {
                    M.toast({html: data});
                }
            });
        }
    }
    fr.readAsText(files.item(0));

}