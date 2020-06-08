# CameraSlider

## Hardware (www.futurashop.it)
- COMING SOON!

## Setup
1) Flash Arduino Nano with sketch: utils/Arduino_CameraSlider/Arduino_CameraSlider.ino
2) Download "Raspberry Pi OS (32-bit) Lite" and flash your MicroSD card
3) Before remove your MicroSD card from your PC, create "ssh" empty file and "wpa_supplicant.conf" file and for this last file put inside it these lines:
```
country=US  # Your 2-digit country code
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
network={
    ssid="YOUR_NETWORK_NAME"
    psk="YOUR_PASSWORD"
    key_mgmt=WPA-PSK
}
```
4) Put MicroSD card in your Raspberry Pi, switch on the power supply and wait few seconds
5) Discover the IP of your Raspberry Pi and connect to it with Putty or MobaXTerm in SSH
6) Execute this sequence of commands one by one:
```
cd /home/pi/
sudo apt-get install git
git clone https://github.com/open-electronics/CameraSlider.git
cd CameraSlider/utils/
sudo chmod a+x install.sh
sudo bash install.sh
```
7) After the automatic reboot at the end of setup, open your browser and go to:   http://slider/
8) Have fun!
