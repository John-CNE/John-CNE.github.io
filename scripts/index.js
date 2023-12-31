// DOM Elements
const connectButton = document.getElementById("connectBleButton");
const disconnectButton = document.getElementById("disconnectBleButton");
const onButton = document.getElementById("onButton");
const offButton = document.getElementById("offButton");
const retrievedValue = document.getElementById("valueContainer");
const latestValueSent = document.getElementById("valueSent");
const bleStateContainer = document.getElementById("bleState");
const timestampContainer = document.getElementById("timestamp");

const connectButtonContainer = document.getElementById("connectBtnContainer");
const controlPanelContainer = document.getElementById("controlPanelContainer");

//Define BLE Device Specs
var deviceName = "ESP32";
var bleService = "19b10000-e8f2-537e-4f6c-d104768a1214";
var ledCharacteristic = "19b10002-e8f2-537e-4f6c-d104768a1214";
var sensorCharacteristic = "19b10001-e8f2-537e-4f6c-d104768a1214";

// #define SERVICE_UUID "38cb58b5-d6d3-444c-9e66-729eca8144f7"
// #define ALARM_STATE_UUID "0aa603c1-166d-4f1a-93cf-afd9303cc236"
// #define ALARM_ARM_UUID "923288aa-4e0f-4525-886b-c62542613270"
// #define BATTERY_LEVEL_UUID "11553b2e-b7d6-4f0e-89ca-03e9d267c930"
// #define SECRET_UUID "ab329035-8267-4ae8-8940-055a180300a1"

//Global Variables to Handle Bluetooth
var bleServer;
var bleServiceFound;
var sensorCharacteristicFound;

const openControlPanel = () => {
  console.log("Open Control Panel");
  connectButtonContainer.classList.add("d-none");
  connectButtonContainer.classList.remove("d-flex");
  controlPanelContainer.classList.add("d-flex");
  controlPanelContainer.classList.remove("d-none");
};

const closeControlPanel = () => {
  console.log("Close Control Panel");
  connectButtonContainer.classList.add("d-flex");
  connectButtonContainer.classList.remove("d-none");
  controlPanelContainer.classList.add("d-none");
  controlPanelContainer.classList.remove("d-flex");
};

// Connect Button (search for BLE Devices only if BLE is available)
connectButton.addEventListener("click", (event) => {
  if (isWebBluetoothEnabled()) {
    connectToDevice();
  }
});

// Disconnect Button
disconnectButton.addEventListener("click", disconnectDevice);

// Write to the ESP32 LED Characteristic
onButton.addEventListener("click", () => writeOnCharacteristic(1));
offButton.addEventListener("click", () => writeOnCharacteristic(0));

// Check if BLE is available in your Browser
function isWebBluetoothEnabled() {
  if (!navigator.bluetooth) {
    console.log("Web Bluetooth API is not available in this browser!");
    bleStateContainer.innerHTML =
      "Web Bluetooth API is not available in this browser!";
    return false;
  }
  console.log("Web Bluetooth API supported in this browser.");
  return true;
}

// Connect to BLE Device and Enable Notifications
function connectToDevice() {
  console.log("Initializing Bluetooth...");
  navigator.bluetooth
    .requestDevice({
      filters: [{ name: deviceName }],
      optionalServices: [bleService],
    })
    .then((device) => {
      console.log("Device Selected:", device.name);
      bleStateContainer.innerHTML = "Connected to device " + device.name;
      bleStateContainer.style.color = "#24af37";
      device.addEventListener("gattservicedisconnected", onDisconnected);
      return device.gatt.connect();
    })
    .then((gattServer) => {
      bleServer = gattServer;
      console.log("Connected to GATT Server");
      return bleServer.getPrimaryService(bleService);
    })
    .then((service) => {
      bleServiceFound = service;
      console.log("Service discovered:", service.uuid);
      return service.getCharacteristic(sensorCharacteristic);
    })
    .then((characteristic) => {
      console.log("Characteristic discovered:", characteristic.uuid);
      sensorCharacteristicFound = characteristic;
      characteristic.addEventListener(
        "characteristicvaluechanged",
        handleCharacteristicChange
      );
      characteristic.startNotifications();
      console.log("Notifications Started.");
      return characteristic.readValue();
    })
    .then((value) => {
      console.log("Read value: ", value);
      const decodedValue = new TextDecoder().decode(value);
      console.log("Decoded value: ", decodedValue);
      retrievedValue.innerHTML = decodedValue;
      openControlPanel();
    })
    .catch((error) => {
      console.log("Error: ", error);
    });
}

function onDisconnected(event) {
  console.log("Device Disconnected:", event.target.device.name);
  bleStateContainer.innerHTML = "Device disconnected";
  bleStateContainer.style.color = "#d13a30";

  connectToDevice();
}

function handleCharacteristicChange(event) {
  const newValueReceived = new TextDecoder().decode(event.target.value);
  console.log("Characteristic value changed: ", newValueReceived);
  retrievedValue.innerHTML = newValueReceived;
  timestampContainer.innerHTML = getDateTime();
}

function writeOnCharacteristic(value) {
  if (bleServer && bleServer.connected) {
    bleServiceFound
      .getCharacteristic(ledCharacteristic)
      .then((characteristic) => {
        console.log("Found the LED characteristic: ", characteristic.uuid);
        const data = new Uint8Array([value]);
        return characteristic.writeValue(data);
      })
      .then(() => {
        latestValueSent.innerHTML = value;
        console.log("Value written to LEDcharacteristic:", value);
      })
      .catch((error) => {
        console.error("Error writing to the LED characteristic: ", error);
      });
  } else {
    console.error(
      "Bluetooth is not connected. Cannot write to characteristic."
    );
    window.alert(
      "Bluetooth is not connected. Cannot write to characteristic. \n Connect to BLE first!"
    );
  }
}

function disconnectDevice() {
  console.log("Disconnect Device.");
  if (bleServer && bleServer.connected) {
    if (sensorCharacteristicFound) {
      sensorCharacteristicFound
        .stopNotifications()
        .then(() => {
          console.log("Notifications Stopped");
          return bleServer.disconnect();
        })
        .then(() => {
          console.log("Device Disconnected");
          bleStateContainer.innerHTML = "Device Disconnected";
          bleStateContainer.style.color = "#d13a30";
          closeControlPanel();
        })
        .catch((error) => {
          console.log("An error occurred:", error);
        });
    } else {
      console.log("No characteristic found to disconnect.");
    }
  } else {
    // Throw an error if Bluetooth is not connected
    console.error("Bluetooth is not connected.");
    window.alert("Bluetooth is not connected.");
  }
}

function getDateTime() {
  var currentdate = new Date();
  var day = ("00" + currentdate.getDate()).slice(-2); // Convert day to string and slice
  var month = ("00" + (currentdate.getMonth() + 1)).slice(-2);
  var year = currentdate.getFullYear();
  var hours = ("00" + currentdate.getHours()).slice(-2);
  var minutes = ("00" + currentdate.getMinutes()).slice(-2);
  var seconds = ("00" + currentdate.getSeconds()).slice(-2);

  var datetime =
    day +
    "/" +
    month +
    "/" +
    year +
    " at " +
    hours +
    ":" +
    minutes +
    ":" +
    seconds;
  return datetime;
}
