#!/bin/bash

echo "Checking internet connection"
wget -q --tries=10 --timeout=20 --spider http://google.com
if [[ $? -eq 0 ]]; then
	echo "Online"
else
	echo "ERROR: no internet connection"
	exit 1
fi

echo "Updating"
sudo apt-get update -qq >> /dev/null

echo "Installing software"
sudo apt-get install python3-dev python3-smbus python3-flask i2c-tools mariadb-server python3-mysql.connector -y >> /dev/null

echo "Updating hostname"
sudo sed -i -e "s/raspberrypi/slider/g" /etc/hosts
sudo sed -i -e "s/raspberrypi/slider/g" /etc/hostname

echo "Database setup"
sudo mysql -u "root" "-padmin" -e "create database cameraslider;"
sudo mysql -u "root" "-padmin" "cameraslider" < "cameraslider.sql"
sudo mysql -u "root" "-padmin" -e "CREATE USER 'cameraslider'@'localhost' IDENTIFIED BY 'cameraslider';"
sudo mysql -u "root" "-padmin" -e "GRANT ALL PRIVILEGES ON * . * TO 'cameraslider'@'localhost';"
sudo mysql -u "root" "-padmin" -e "FLUSH PRIVILEGES;"

echo "i2c setup"
if grep -q 'i2c-bcm2708' /etc/modules; then
  echo 'Seems i2c-bcm2708 module already exists, skip this step.'
else
  echo 'i2c-bcm2708' >> /etc/modules
fi
if grep -q 'i2c-dev' /etc/modules; then
  echo 'Seems i2c-dev module already exists, skip this step.'
else
  echo 'i2c-dev' >> /etc/modules
fi
if grep -q 'dtparam=i2c1=on' /boot/config.txt; then
  echo 'Seems i2c1 parameter already set, skip this step.'
else
  echo 'dtparam=i2c1=on' >> /boot/config.txt
fi
if grep -q 'dtparam=i2c_arm=on' /boot/config.txt; then
  echo 'Seems i2c_arm parameter already set, skip this step.'
else
  echo 'dtparam=i2c_arm=on' >> /boot/config.txt
fi
if [ -f /etc/modprobe.d/raspi-blacklist.conf ]; then
  sed -i 's/^blacklist spi-bcm2708/#blacklist spi-bcm2708/' /etc/modprobe.d/raspi-blacklist.conf
  sed -i 's/^blacklist i2c-bcm2708/#blacklist i2c-bcm2708/' /etc/modprobe.d/raspi-blacklist.conf
else
  echo 'File raspi-blacklist.conf does not exist, skip this step.'
fi

echo "Autostart setup"
sudo touch /lib/systemd/system/slider.service
echo "[Unit]" >> /lib/systemd/system/slider.service
echo "Description=slider server service" >> /lib/systemd/system/slider.service
echo "After=multi-user.target" >> /lib/systemd/system/slider.service
echo "[Service]" >> /lib/systemd/system/slider.service
echo "ExecStart=sudo /usr/bin/python3 -u server.py" >> /lib/systemd/system/slider.service
echo "WorkingDirectory=/home/pi/CameraSlider/" >> /lib/systemd/system/slider.service
echo "StandardOutput=inherit" >> /lib/systemd/system/slider.service
echo "StandardError=inherit" >> /lib/systemd/system/slider.service
echo "Restart=always" >> /lib/systemd/system/slider.service
echo "User=pi" >> /lib/systemd/system/slider.service
echo "[Install]" >> /lib/systemd/system/slider.service
echo "WantedBy=multi-user.target" >> /lib/systemd/system/slider.service
sudo chmod 644 /lib/systemd/system/slider.service
sudo systemctl daemon-reload
sudo systemctl enable slider.service

echo " "
echo " "
echo "*******************************"
echo "      INSTALLATION DONE!       "
echo "*******************************"
echo "Rebooting..."

sudo reboot