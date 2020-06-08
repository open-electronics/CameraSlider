import smbus
import time


class MotionManager():

    def __init__(self, i2c_address, max_length_mm):
        self.Address = i2c_address
        self.MaxLength = max_length_mm
        self.Bus = smbus.SMBus(1)
        self.Status = {
            "Free": True,
            "Status": 0,
            "Position": 0,
            "SequenceID": None,
            "CurrentRow": 1
        }
        self.CMD_INIT = "1"         #   Init system sending initial params (slider length in mm)
        self.CMD_START_MOVE = "2"   #   Start move in one direction with a defined speed
        self.CMD_START_SEQ = "3"    #   Start sequence after loading steps (with CMD_STEP)
        self.CMD_RESET = "4"        #   Stops movement, go home or sequence and delete steps array onboard
        self.CMD_STEP = "5"         #   Step load command
        self.CMD_HOME = "6"         #   Go home command
        self.CMD_UPDATE_SPEED = "7" #   Update manual speed
        self.Init()


    #   Init motor, send initial parameters, go home
    def Init(self):
        Command = self.CMD_INIT + "," + str(self.MaxLength)
        self.Bus.write_i2c_block_data(self.Address, 0x00, self.StringToBytes(Command))
        time.sleep(0.2)
        self.GoHome()


    #   Get motor board status
    def GetStatus(self):
        DataOk = False
        while not DataOk:
            try:
                Data = self.Bus.read_i2c_block_data(self.Address, 0, 3)
                self.Status["Free"] = True if int(Data[0]) == 0 else False
                self.Status["Status"] = int(Data[0])
                self.Status["Position"] = int(Data[1])
                self.Status["CurrentRow"] = int(Data[2])
                if (self.Status["Status"] == 1 and self.Status["CurrentRow"] == 2) or (self.Status["Status"] == 3):
                    pass
                else:
                    self.Status["SequenceID"] = None
                DataOk = True
                return self.Status
            except:
                DataOk = False
        return self.Status


    #   Execute go home
    def GoHome(self, speed = 50):
        Command = self.CMD_HOME
        self.Bus.write_i2c_block_data(self.Address, 0x00, self.StringToBytes(Command))
        return True


    #   Start (or continue) manual movement (or change direction)
    def MoveStart(self, direction, speed):
        Command = self.CMD_START_MOVE + "," + str(direction) + "," + str(speed)
        self.Bus.write_i2c_block_data(self.Address, 0x00, self.StringToBytes(Command))
        return True


    #   Update manual speed (if it's still moving manual)
    def UpdateSpeed(self, speed):
        Command = self.CMD_UPDATE_SPEED + "," + str(speed)
        self.Bus.write_i2c_block_data(self.Address, 0x00, self.StringToBytes(Command))
        return True


    #   Stop manual movement
    def MoveStop(self):
        Command = self.CMD_RESET
        self.Bus.write_i2c_block_data(self.Address, 0x00, self.StringToBytes(Command))
        return True


    #   Start sequence
    def SequenceStart(self, id, steps):
        if self.Status["SequenceID"] == None:
            for s in steps:
                Command = self.CMD_STEP + "," + str(steps[s]["Type"]) + "," 
                #   Wait
                if steps[s]["Type"] == 0:
                    Command += str(steps[s]["Params"]["Seconds"]) + ",0"
                #   Go to
                if steps[s]["Type"] == 1:
                    Command += str(steps[s]["Params"]["Seconds"]) + "," + str(steps[s]["Params"]["Position"])
                self.Bus.write_i2c_block_data(self.Address, 0x00, self.StringToBytes(Command))
                time.sleep(0.01)
            Command = self.CMD_START_SEQ
            self.Bus.write_i2c_block_data(self.Address, 0x00, self.StringToBytes(Command))
            self.Status["SequenceID"] = id
            return True
        else:
            return False


    #   Stop sequence
    def SequenceStop(self):
        if self.Status["SequenceID"] != None:
            Command = self.CMD_RESET
            self.Bus.write_i2c_block_data(self.Address, 0x00, self.StringToBytes(Command))
            self.Status["SequenceID"] = None
            self.Status["StepNumber"] = None
            return True
        else:
            return False


    #########################################################################
    #########################################################################


    def StringToBytes(self, string):
        value = []
        for c in string:
            value.append(ord(c))
        return value