const Domoticz = require('./domo-code/domoticz');
const conf = require('./conf.json');
const api = new Domoticz({
  protocol: conf.protocol,
  host: conf.host,
  port: conf.port,
  username: conf.username,
  password: conf.password
});

api.getDevices({}, function (err, devices) {
  if (err) {
    console.error('Error:', err);
    return;
  }
  
  const devArray = devices.result;
  let count = 0;
  let humidityCount = 0;
  
  for (let i = 0; i < devArray.length; i++) {
    const device = devArray[i];
    
    if (device.PlanID === '0' || device.PlanID === '') continue;
    
    const devType = device.Type;
    count++;
    
    if (devType.startsWith('Temp + Humidity') || devType.startsWith('Humidity')) {
      humidityCount++;
      console.log(`Found humidity device #${humidityCount}:`, device.idx, device.Name, devType);
    }
  }
  
  console.log('\nTotal devices with PlanID:', count);
  console.log('Total humidity devices:', humidityCount);
});
