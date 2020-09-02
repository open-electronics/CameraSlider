#include <Wire.h>
#include <AccelStepper.h>

#define I2C_ADDRESS 0x8
#define PIN_MOTOR_DIR 5
#define PIN_MOTOR_STEP 2
#define PIN_MOTOR_END 12
#define STEPS_PER_MM 5
#define MAX_SPEED 1000
#define BOUNCE_SPEED 1000
#define HOME_SPEED -500
#define DEBUG_ON


#ifdef DEBUG_ON
  bool Debug = true;
#else
  bool Debug = false;
#endif
AccelStepper StepperMotor(AccelStepper::DRIVER, PIN_MOTOR_DIR, PIN_MOTOR_STEP);
int MaxLength = 1000;       //  Default max slider length (in mm)
int MaxSteps = MaxLength * STEPS_PER_MM;
byte Status = 0;            //  0 idle (free), 1 going home, 2 going manual, 3 executing sequence
byte CurrentPosition = 0;   //  Current slider position (in %)
byte CurrentRow = 0;        //  Current sequence row (0 no sequence execution, starting from 1)
typedef struct {
  int Type;
  int Seconds;
  int Position;
  } StepType;
StepType Steps[50];
int StepCount = 0;
unsigned long StepTimer = 0;

char InData[16];
char InChar = -1;
byte Index = 0;
byte CommandPos = -1;
int Command[4];

int PermittedDir = 0;
int CurrentDir = 1;



void setup() {
  
  if(Debug) Serial.begin(115200);

  //  Init pins
  pinMode(PIN_MOTOR_END, INPUT_PULLUP);

  //  Init motor
  StepperMotor.setMaxSpeed(MAX_SPEED);

  //  Init i2c communication
  Wire.begin(I2C_ADDRESS);              
  Wire.onReceive(ReceiveEvent);
  Wire.onRequest(RequestEvent);

  //  Init steps
  ResetSteps();

}


  
void loop() {
  
  //  Moving: GoHome or Manual
  if(Status == 1 || Status == 2) {
    StepperMotor.runSpeed();  
  }

  //  Moving: Sequence   (check if step is finished)
  if(Status == 3) {
    if(Steps[CurrentRow].Type == 0 && millis() >= StepTimer) {
      //  Check: Wait step
      NextStep();
    } else if(Steps[CurrentRow].Type == 1) {
      //  Check: Go To step
      if(StepperMotor.distanceToGo() == 0) {
        NextStep();
      } else {
        StepperMotor.runSpeedToPosition();
      }
    }
  }

  //  Check stop for GoHome
  if(Status == 1 && digitalRead(PIN_MOTOR_END) == HIGH) {
    StepperMotor.stop();
    StepperMotor.setCurrentPosition(0);
    WriteLog("Home stop.");
    if(CurrentRow == 1) {
      WriteLog("Sequence start.");
      Status = 3;
      CurrentRow = 0;
      ExecuteStep();
    } else {
      Status = 0;
      PermittedDir = 1;
      StepperMotor.setAcceleration(BOUNCE_SPEED);
      StepperMotor.runToNewPosition(1);
    }
  }

  //  Check stop for Manual
  if(Status == 2 && ( StepperMotor.currentPosition() <= 0 || StepperMotor.currentPosition() >= MaxSteps  )) {
    StepperMotor.stop();
    Status = 0;
    WriteLog("Stop at: " + String(StepperMotor.currentPosition()));
    if(StepperMotor.currentPosition() <= 0) {
      //  Low limit: go to step 1
      PermittedDir = 1;
      StepperMotor.setAcceleration(BOUNCE_SPEED);
      StepperMotor.runToNewPosition(1);
    } else if(StepperMotor.currentPosition() >= MaxSteps) {
      //  High limit go to step max - 1
      PermittedDir = -1;
      StepperMotor.setAcceleration(BOUNCE_SPEED);
      StepperMotor.runToNewPosition(MaxSteps-1);
    }
    WriteLog("Manual auto stop (limit reached). (" + String(StepperMotor.currentPosition()) + ")");
  }

  
}


//  Read values received from Raspberry
void ReceiveEvent(int HowMany) {

  Wire.read();
  if (HowMany > 1) {
    for(int i=1; i<HowMany; i++) {
      InChar = Wire.read();
      if(InChar != ',') {
        InData[Index] = InChar;
        Index++;
      } else if(InChar == ',') {
        CommandPos++;
        Command[CommandPos] = atoi(InData);
        ResetInData();
      }
    }
    CommandPos++;
    Command[CommandPos] = atoi(InData);
    CommandPos = -1;
    ResetInData();
    ExecuteCommand(Command[0], Command[1], Command[2], Command[3]);
  }
  
}


//  Send current status to Raspberry
void RequestEvent() {

  CurrentPosition = (int) ((100 * (StepperMotor.currentPosition() / STEPS_PER_MM)) / MaxLength);
  byte Data[3] = {Status, CurrentPosition, CurrentRow+1};
  Wire.write(Data, sizeof(Data));  
  
}


//  Execute i2c command
void ExecuteCommand(int Command, int Param1, int Param2, int Param3) {

  switch(Command) {
    //  CMD_INIT
    case 1:
      MaxLength = Param1;
      MaxSteps = MaxLength * STEPS_PER_MM;
      WriteLog("Init param (" + String(Param1) + ").");
      break;
     // CMD_START_MOVE
    case 2:
      if( (Status == 0 || Status == 2) && (PermittedDir == 0 || PermittedDir == Param1) ) {
        Status = 2;
        PermittedDir = 0;
        CurrentDir = Param1;
        StepperMotor.stop();
        StepperMotor.setSpeed((Param1 * Param2) * STEPS_PER_MM);
        WriteLog("Start or update manual move.");
      }
      break;
    //  CMD_START_SEQ
    case 3:
      if(Status == 0) {
        if(StepCount > 0) {
          WriteLog("Start sequence.");
          CurrentRow = 1;
          GoHome();
        } else {
          ExecuteCommand(4, 0, 0, 0);
        }
      }
      break;
    //  CMD_RESET
    case 4:
      if(Status != 1) {
        StepperMotor.stop();
        ResetSteps();
        Status = 0;
        PermittedDir = 0;
        WriteLog("Reset.");
      }
      break;
    //  CMD_STEP
    case 5:
      Steps[StepCount].Type = Param1;
      Steps[StepCount].Seconds = Param2;
      Steps[StepCount].Position = Param3;
      StepCount++;
      break;
    //  CMD_HOME
    case 6:
      if(Status == 0) {
        GoHome();
      }
      break;
    //  CMD_UPDATE_SPEED
    case 7:
      if(Status == 2) {
        StepperMotor.stop();
        StepperMotor.setSpeed((Param1 * CurrentDir) * STEPS_PER_MM);
      }
      break;
  }
  
}


//  Start going home
void GoHome() {

  Status = 1;
  StepperMotor.setSpeed(HOME_SPEED);
  WriteLog("GoHome.");

}


//  Execute current sequence step
void ExecuteStep() {

  WriteLog("Step: " + String(CurrentRow+1));
  switch(Steps[CurrentRow].Type) {
    case 0:
      StepperMotor.stop();
      StepTimer = millis() + (Steps[CurrentRow].Seconds * 1000);
      WriteLog("Wait " + String(Steps[CurrentRow].Seconds) + " sec.");
    break;
    case 1:
      StepperMotor.stop();
      StepTimer = millis() + (Steps[CurrentRow].Seconds * 1000);
      int DeltaSteps = abs((Steps[CurrentRow].Position * STEPS_PER_MM) - StepperMotor.currentPosition());
      int Speed = (int) (DeltaSteps / Steps[CurrentRow].Seconds);
      StepperMotor.moveTo(Steps[CurrentRow].Position * STEPS_PER_MM);
      StepperMotor.setSpeed(Speed);
      WriteLog("Move to " + String(Steps[CurrentRow].Position) + "mm in " + String(Steps[CurrentRow].Seconds) + " sec. (speed " + String(Speed / STEPS_PER_MM) + " mm/s).");
    break;
  }
  
}


//  Go to next sequence step or end sequence if it was last step
void NextStep() {

  CurrentRow++;
  if(Steps[CurrentRow].Type == -1) {
    WriteLog("Sequence end.");
    ExecuteCommand(4, 0, 0, 0);
  } else {
    ExecuteStep();
  }
  
}


//  Reset steps array
void ResetSteps() {
  
  for(int i=0; i<50; i++) {
    Steps[i].Type = -1;
    Steps[i].Seconds = 0;
    Steps[i].Position = 0;
  }
  StepCount = 0;
  CurrentRow = 0;

}


//  Reset i2c receiving data array
void ResetInData() {

  Index = 0;
  for(byte i=0;i<16;i++) {InData[i] = '\0';}
  
}



//  Write serial log
void WriteLog(String line) {

  if(Debug) Serial.println(line);
  
}
