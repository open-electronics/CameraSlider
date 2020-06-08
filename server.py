from flask import Flask, send_file, redirect, url_for, abort, request, jsonify, Response, render_template
import mysql.connector
import json
import os
import time
from motionmanager import MotionManager


global SystemSettings, CurrentStatus, MotionManager


app = Flask(__name__)




#########################################
#               WEB PAGES               #
#########################################


#   index.html
@app.route("/")
@app.route("/index.html")
def index():
    return render_template("index.html")


#   manual.html
@app.route("/manual.html")
def manual():
    return render_template("manual.html")


#   sequences.html
@app.route("/sequences.html")
def sequence():
    return render_template("sequences.html")


#   edit_sequence.html
@app.route("/edit_sequence.html")
def edit_sequence():
    return render_template("edit_sequence.html")


#   execute_sequence.html
@app.route("/execute_sequence.html")
def execute_sequence():
    return render_template("execute_sequence.html")


#   settings.html
@app.route("/settings.html")
def settings():
    return render_template("settings.html")




#########################################
#                 INDEX                 #
#########################################


#   Shutdown
@app.route("/shutdown", methods = ['POST'])
def shutdown():
    global MotionManager
    MotionManager.SequenceStop()
    MotionManager.MoveStop()
    os.system("sudo shutdown -h now")
    return ""




#########################################
#                 MANUAL                #
#########################################


#   Move back or forward or GoHome
@app.route("/move", methods = ['POST'])
def move():
    global MotionManager
    Direction = int(request.form["Direction"])
    Speed = int(request.form["Speed"])
    if Direction == 0:
        MotionManager.GoHome()
    else:
        MotionManager.MoveStart(Direction, Speed)
    return ""


#   Update manual speed (if it's still moving manual)
@app.route("/update_speed", methods = ['POST'])
def update_speed():
    global MotionManager
    Speed = int(request.form["Speed"])
    MotionManager.UpdateSpeed(Speed)
    return ""


#   Stops every manual movement except GoHome
@app.route("/stop", methods = ['POST'])
def stop():
    global MotionManager
    MotionManager.MoveStop()
    return ""




#########################################
#              SEQUENCES                #
#########################################


#   Load sequences from database
@app.route("/load_sequences", methods = ["GET"])
def load_sequences():
    Cursor = DBConn.cursor()
    Cursor.execute("SELECT id, name FROM sequences ORDER BY name")
    Result = Cursor.fetchall()
    Sequences = {}
    for row in Result:
        Sequences[row[0]] = row[1]
    return jsonify(Sequences)


#   Delete sequence
@app.route("/delete_sequence", methods = ["POST"])
def delete_sequence():
    Cursor = DBConn.cursor()
    Cursor.execute("DELETE FROM steps WHERE eid_sequence = " + request.form["ID"])
    Cursor.execute("DELETE FROM sequences WHERE id = " + request.form["ID"])
    DBConn.commit()
    return ""


#   Duplicate sequence
@app.route("/duplicate_sequence", methods = ["POST"])
def duplicate_sequence():
    Cursor = DBConn.cursor()
    Cursor.execute("SELECT id, name FROM sequences WHERE id = " + request.form["ID"])
    Result = Cursor.fetchall()
    for seq in Result:
        SequenceCursor = DBConn.cursor()
        SequenceCursor.execute("INSERT INTO sequences (name) VALUES ('(Copy) " + seq[1] + "')")
        DBConn.commit()
        SequenceID = SequenceCursor.lastrowid
        #   Steps
        StepCursor = DBConn.cursor()
        Cursor.execute("SELECT id, motor, row, type, params FROM steps WHERE eid_sequence = '" + str(seq[0]) + "' ORDER BY row")
        StepResult = Cursor.fetchall()
        for step in StepResult:
            StepCursor.execute("INSERT INTO steps (eid_sequence, motor, row, type, params) VALUES (" + str(SequenceID) + ", '" + str(step[1]) + "', " + str(step[2]) + ", " + str(step[3]) + ", '" + json.dumps(json.loads(step[4])) + "')")
        DBConn.commit()
    return ""


#   Load sequence and steps from database
@app.route("/load_sequence", methods = ["POST"])
def load_sequence():
    Cursor = DBConn.cursor()
    Cursor.execute("SELECT name FROM sequences WHERE id = '" + request.form["SequenceID"] + "'")
    Result = Cursor.fetchall()
    Sequence = {}
    Sequence["Name"] = Result[0][0]
    Cursor.execute("SELECT id, motor, row, type, params FROM steps WHERE eid_sequence = '" + request.form["SequenceID"] + "' ORDER BY row ASC")
    Result = Cursor.fetchall()
    Sequence["Steps"] = {}
    for row in Result:
        Sequence["Steps"][row[2]] = {}
        Sequence["Steps"][row[2]]["ID"] = row[0]
        Sequence["Steps"][row[2]]["Motor"] = row[1]
        Sequence["Steps"][row[2]]["Row"] = row[2]
        Sequence["Steps"][row[2]]["Type"] = row[3]
        Sequence["Steps"][row[2]]["Params"] = json.loads(row[4].decode("ascii"))
    return jsonify(Sequence)


#   Save sequence (name)
@app.route("/save_sequence", methods = ["POST"])
def save_sequence():
    Cursor = DBConn.cursor()
    if(request.form["SequenceID"] != "-1"):
        Cursor.execute("UPDATE sequences SET name = '" + request.form["Name"] + "' WHERE id = " + request.form["SequenceID"])
        DBConn.commit()
        return request.form["SequenceID"]
    else:
        Cursor.execute("INSERT INTO sequences (name) VALUES ('" + request.form["Name"] + "')")
        DBConn.commit()
        return str(Cursor.lastrowid)


#   Save step and re-order all rows (positions)
@app.route("/save_step", methods = ["POST"])
def save_step():
    Params = {}
    if(int(request.form["Type"]) == 0):
        Params["Seconds"] = int(request.form["Seconds"])
    if(int(request.form["Type"]) == 1):
        Params["Seconds"] = int(request.form["Seconds"])
        Params["Position"] = int(request.form["Position"]) * 10
    Cursor = DBConn.cursor()
    Cursor.execute("UPDATE steps SET row = row + 1 WHERE eid_sequence = " + request.form["SequenceID"] + " AND row >= " + request.form["Row"])
    DBConn.commit()
    Cursor.execute("INSERT INTO steps (eid_sequence, motor, row, type, params) VALUES (" + str(request.form["SequenceID"]) + ", '" + str(request.form["Motor"]) + "', " + str(request.form["Row"]) + ", " + str(request.form["Type"]) + ", '" + json.dumps(Params) + "')")
    DBConn.commit()
    return ""


#   Delete step and re-order all rows (positions)
@app.route("/delete_step", methods = ["POST"])
def delete_step():
    Cursor = DBConn.cursor()
    Cursor.execute("DELETE FROM steps WHERE id = " + request.form["ID"])
    Cursor.execute("UPDATE steps SET row = row - 1 WHERE eid_sequence = " + request.form["SequenceID"] + " AND row > " + request.form["Position"])
    DBConn.commit()
    return ""


#   Execute or stop sequence
@app.route("/execute_stop", methods = ["POST"])
def execute_stop():
    global MotionManager
    if (request.form["Stop"] == "false" and int(request.form["SequenceID"]) != -1):
        #   Start sequence
        Cursor = DBConn.cursor()
        Cursor.execute("SELECT id, motor, row, type, params FROM steps WHERE eid_sequence = '" + str(request.form["SequenceID"]) + "' ORDER BY row")
        Result = Cursor.fetchall()
        Steps = {}
        for step in Result:
            Steps[step[2]] = {}
            Steps[step[2]]["Type"] = step[3]
            Steps[step[2]]["Params"] = json.loads(step[4].decode("ascii"))
        Response = MotionManager.SequenceStart(int(request.form["SequenceID"]), Steps)
        if (Response):
            get_status()
            return ""
        else:
            return "Error"
    elif (request.form["Stop"] == "true" and int(request.form["SequenceID"]) != -1):
        #   Stop sequence
        Response = MotionManager.SequenceStop()
        if (Response):
            get_status()
            return ""
        else:
            return "Error"
    else:
        #   Error
        return "Error"




#########################################
#               SETTINGS                #
#########################################


#   Load settings from database
@app.route("/load_settings", methods = ["GET"])
def load_settings():
    global SystemSettings
    return jsonify(SystemSettings)


#   Save settings into database and reboot
@app.route("/save_settings", methods = ["POST"])
def save_settings():
    global MotionManager
    if request.form["SliderLength"].isnumeric():
        Cursor = DBConn.cursor()
        Settings = {
            "SliderLength": int(request.form["SliderLength"])
        }
        Cursor.execute("UPDATE settings SET params = '" + json.dumps(Settings) + "' WHERE name LIKE 'CameraSlider'")
        DBConn.commit()
        MotionManager.SequenceStop()
        MotionManager.MoveStop()
        os.system("sudo reboot")
        return "Rebooting..."
    else:
        return "Error: wrong settings values."


#   Export settings and sequences to JSON file and download it
@app.route("/export", methods = ["GET"])
def export_JSON():
    Cursor = DBConn.cursor()
    Cursor.execute("SELECT params FROM settings WHERE name LIKE 'CameraSlider'")
    Result = Cursor.fetchall()
    Export = {}
    #   Settings
    Export["Settings"] = json.loads(Result[0][0].decode("ascii"))
    #   Sequences
    Export["Sequences"] = {}
    Cursor.execute("SELECT id, name FROM sequences ORDER BY name")
    Result = Cursor.fetchall()
    for seq in Result:
        Export["Sequences"][seq[0]] = {}
        Export["Sequences"][seq[0]]["Name"] = seq[1]
        Export["Sequences"][seq[0]]["Steps"] = {}
        #   Steps
        StepCursor = DBConn.cursor()
        StepCursor.execute("SELECT id, motor, row, type, params FROM steps WHERE eid_sequence = '" + str(seq[0]) + "' ORDER BY row")
        StepResult = StepCursor.fetchall()
        for step in StepResult:
            Export["Sequences"][seq[0]]["Steps"][step[2]] = {}
            Export["Sequences"][seq[0]]["Steps"][step[2]]["Row"] = step[2]
            Export["Sequences"][seq[0]]["Steps"][step[2]]["Motor"] = step[1]
            Export["Sequences"][seq[0]]["Steps"][step[2]]["Type"] = step[3]
            Export["Sequences"][seq[0]]["Steps"][step[2]]["Params"] = json.loads(step[4].decode("ascii"))
    #   Version
    Export["Version"] = Version
    try:
        with open("static/data/export.json", "w") as ExportFile:
            json.dump(Export, ExportFile, sort_keys = True, indent = 4, ensure_ascii = False)
    except:
        return "Error: exception on export."
    return ""


#   Import settings and sequences
@app.route("/import", methods = ["POST"])
def import_JSON():
    global MotionManager
    Import = request.form["Import"]
    if isJSON(Import):
        Import = json.loads(request.form["Import"])
        Cursor = DBConn.cursor()
        #   Settings
        Cursor.execute("UPDATE settings SET params = '" + json.dumps(Import["Settings"]) + "' WHERE name LIKE 'CameraSlider'")
        DBConn.commit()
        #   Sequences
        Cursor.execute("TRUNCATE TABLE steps")
        Cursor.execute("TRUNCATE TABLE sequences")
        DBConn.commit()
        for seq in Import["Sequences"]:
            Cursor.execute("INSERT INTO sequences (name) VALUES ('" + Import["Sequences"][seq]["Name"] + "')")
            DBConn.commit()
            SequenceID = Cursor.lastrowid
            #   Steps
            Steps = Import["Sequences"][seq]["Steps"]
            for step in Steps:
                Cursor.execute("INSERT INTO steps (eid_sequence, motor, row, type, params) VALUES (" + str(SequenceID) + ", '" + str(Steps[step]["Motor"]) + "', " + str(Steps[step]["Row"]) + ", " + str(Steps[step]["Type"]) + ", '" + json.dumps(Steps[step]["Params"]) + "')")
            DBConn.commit()
        MotionManager.SequenceStop()
        MotionManager.MoveStop()
        os.system("sudo reboot")
        return "Rebooting..."
    else:
        return "Error: wrong settings values."





#########################################
#               UTILITIES               #
#########################################


#   Get current system status
@app.route("/get_status", methods = ["GET"])
def get_status():
    global CurrentStatus, MotionManager
    CurrentStatus = MotionManager.GetStatus()
    return jsonify(CurrentStatus)


#   Check if string is JSON or not
def isJSON(JSONString):
    try:
        json_object = json.loads(JSONString)
    except ValueError as e:
        return False
    return True



if __name__ == '__main__':

    Version = 1

    DBConn = mysql.connector.connect(host = "localhost", user = "cameraslider", passwd = "cameraslider", database = "cameraslider")

    #   Get system settings
    Cursor = DBConn.cursor()
    Cursor.execute("SELECT params FROM settings WHERE name LIKE 'CameraSlider'")
    Result = Cursor.fetchall()
    SystemSettings = json.loads(Result[0][0].decode("ascii"))

    MotionManager = MotionManager(0x8, int(SystemSettings["SliderLength"]))

    app.run(host = '0.0.0.0', port = 80, threaded = True)
