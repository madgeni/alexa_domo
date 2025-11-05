# Domoticz Alexa Smart Home Integration

This integration allows you to control your Domoticz devices through Amazon Alexa using the Alexa Smart Home API v3.

Since 2023, Domoticz includes a built-in OAuth2 server that works with Alexa's account linking. The Lambda function will use the JWT tokens issued by Domoticz to authenticate API requests.

## Features

- Control lights (on/off, dimming)
- Control scenes and groups
- Control selector switches (mode controllers)
- Monitor temperature sensors
- Monitor humidity sensors
- Control thermostats
- Control blinds and locks
- Monitor various sensors (weight, pH, absolute humidity)

## Requirements

- **Domoticz home automation system** - Your Domoticz instance must be accessible from the Lambda function over Legacy IP, with a valid SSL certificate.
- **Amazon Developer Account** - Sign up at [developer.amazon.com](https://developer.amazon.com) to create your Alexa Smart Home skill
- **AWS Account** - Needed to host the Lambda function that bridges Alexa and Domoticz. AWS Lambda offers a free tier with 1 million requests per month, which is more than sufficient for typical home automation use.

## Installation

### Prepare Domoticz

Before setting up the Alexa skill, ensure your Domoticz instance is properly configured:

1. **Network accessibility** - Your Domoticz instance must be accessible from the internet via Legacy IP, as Lambda functions cannot use IPv6 without additional VPC configuration. You may need to configure port forwarding on your router.

2. **Valid SSL certificate** - Domoticz must use HTTPS with a certificate from a recognized Certificate Authority. Self-signed certificates will not work. LetsEncrypt certificates work well and are free.

3. **Create a dedicated Alexa user** (recommended):
   - Go to Setup → Settings → Users
   - Create a new user (e.g., "alexa")
   - Grant access only to the devices you want to control via Alexa
   - This limits the scope of what Alexa can access

4. **Assign devices to room plans** - Each device you want to control via Alexa must be assigned to a room plan in Domoticz.

5. **Configure OAuth2 application**:
   - Ensure Domoticz is started with the `-vhostname` option to use the correct hostname in OAuth2 tokens (e.g., `-vhostname your-domoticz-host.example.com`). Check that the correct hostname appears in the URLs returned from https://your-domoticz-host.example.com/.well-known/openid-configuration and that those URLs are reachable from the outside.
   - Go to Setup → Applications
   - Click "Add Application"
   - Application Name: `domoticz-alexa` (or your preferred name)
   - Client Secret: Generate a secure random string (save this for later)
   - Leave "Is Public" switch OFF
   - Click "Add"
   - Note the Client ID and Client Secret (you'll need these for Alexa account linking)

### Create an Alexa Smart Home Skill

1. Log in to the [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask)
2. Click "Create Skill"
3. Configure the skill:
   - Skill name: Choose a name (e.g., "Domoticz")
   - Primary locale: English (US) or your preferred locale
   - Choose a model: Smart Home
   - Choose a method to host: Provision your own
4. Click "Create skill"
5. Note your Skill ID (you'll need this later)

Leave this browser tab open — you'll return to complete the skill setup after creating the Lambda function.

### Create an AWS Lambda Function

It's easiest to create the Lambda function using the Makefile if you have the AWS CLI configured, or you can do it through the AWS Console in your web browser.

**Using the Makefile:**

1. Configure AWS CLI credentials (see [AWS CLI Quick Start](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-quickstart.html)). For a personal setup, it's acceptable to use [user credentials](https://docs.aws.amazon.com/cli/latest/userguide/cli-authentication-user.html)
2. Set `SKILL_ID` at the top of the `Makefile` (recommended for better security, but not strictly required)
3. Run the setup commands:
   ```bash
   make create-role
   make create-function
   make add-alexa-permission
   ```

To deploy code updates later, you can run:
```bash
make deploy
```

**Using the AWS Console:**

1. Log in to the [AWS Console](https://console.aws.amazon.com/)
2. Navigate to Lambda and click "Create function"
3. Choose "Author from scratch"
4. Configure the function:
   - Function name: `domoticz-alexa` (or your preferred name)
   - Runtime: Node.js 22.x
   - Architecture: arm64
   - Execution role: Create a new role with basic Lambda permissions
5. Click "Create function"
6. In the Configuration tab:
   - Set Timeout to 80 seconds
   - Set Memory to 512 MiB
7. In the Code tab, create a zip file and upload it:
   ```bash
   make zip
   ```
   Then click "Upload from" → ".zip file" and select `lambda-domoticz-alexa.zip`
8. Click "Add trigger"
9. Select "Alexa Smart Home"
10. Enter your Skill ID (found in the Alexa Developer Console under "Skill ID")
11. Click "Add"
12. Note your Lambda function ARN (you'll need this later)

### Complete the Skill Setup

Return to the Alexa Developer Console browser tab from earlier. You should be in the Build tab.

1. Go to "Smart Home"
2. Set "Payload version" to "v3"
3. Under "Default endpoint", enter your Lambda function ARN
4. Click "Save"
5. Go to your skill's "Account Linking" section
6. Configure the OAuth settings to use Domoticz's built-in OAuth2 server:
   - Authorization URI: `https://your-domoticz-host.example.com/oauth2/v1/authorize`
   - Access Token URI: `https://your-domoticz-host.example.com/oauth2/v1/token`
   - Client ID: Same as configured in Domoticz (e.g., `domoticz-alexa`)
   - Client Secret: Same as configured in Domoticz
   - Authentication Scheme: Credentials in request body
   - Scope: `profile` (or any value — Domoticz doesn't use scopes but Alexa requires one)
7. Click "Save"
8. (Optional) Go to your skill's "Permissions" section and enable "Send Alexa Events". We do not support this yet, but we hope to add it in future.
9. (Optional) Go to the "Distribution" tab and add skill icons:
   - Small Skill Icon (108x108 px): Upload `icons/app_icon.png`
   - Large Skill Icon (512x512 px): Upload `icons/app_icon_large.png`
   - Click "Save"

### Enable the Skill

1. Open the Alexa app on your phone
2. Go to Skills & Games → Your Skills → Dev
3. Find your skill and click "Enable to Use"
4. Complete the account linking process
5. Alexa will discover your Domoticz devices

### Discover Devices

Say "Alexa, discover devices" or use the Alexa app:
1. Open the Alexa app
2. Go to Devices
3. Tap the "+" icon
4. Select "Add Device"
5. Choose "Other" and follow the prompts

Your Domoticz devices should now appear in Alexa!

## Supported Device Types

### Lights
- PowerController (on/off)
- BrightnessController (dimming)
- ColorController (RGB color)
- ColorTemperatureController (white temperature)

### Scenes and Groups
- SceneController (activate scenes)
- PowerController (on/off for groups)

### Selector Switches
- ModeController with custom modes based on Domoticz LevelNames

### Temperature Sensors
- TemperatureSensor

### Humidity Sensors
- TemperatureSensor and HumiditySensor (combined)

### Thermostats
- ThermostatController (set target temperature)
- TemperatureSensor (current temperature)

### Blinds
- RangeController (position control with open/close presets)

### Locks
- LockController

### Other Sensors
- RangeController (weight, pH, absolute humidity)
- PercentageController (percentage sensors)

## Device Discovery

Devices are automatically discovered from Domoticz when you enable the skill in the Alexa app. The integration:

1. Fetches all devices from Domoticz
2. Maps them to appropriate Alexa device types
3. Configures capabilities based on device features
4. Returns discovery response to Alexa

To rediscover devices after adding new ones in Domoticz:
1. Open the Alexa app
2. Go to Devices
3. Tap the "+" icon
4. Select "Add Device"
5. Choose your skill and rediscover

## State Reporting

The integration supports state reporting for all device types. When you view a device in the Alexa app, it queries the current state from Domoticz.

State reporting is configured with:
- `retrievable: true` - Alexa can query device state
- `proactivelyReported: false` - No proactive updates (polling mode)

## Voice Control Examples

### Lights
- "Alexa, turn on the kitchen light"
- "Alexa, dim the bedroom light to 50%"
- "Alexa, set the living room light to blue"

### Scenes
- "Alexa, activate bedtime"
- "Alexa, turn on movie time"

### Selector Switches
- "Alexa, set Albie to kept in"
- "Alexa, set lounge source to HDMI 1"

### Thermostats
- "Alexa, set kitchen temperature to 20 degrees"

### Blinds
- "Alexa, open the bedroom blind"
- "Alexa, close the living room blind"
- "Alexa, set the office blind to 50 percent"

### Sensors
- "Alexa, what's the temperature in the bedroom?"

## Troubleshooting

### Device not discovered
- Check that the device is marked as "Used" in Domoticz
- Verify the Domoticz user has access to the device
- Check Lambda CloudWatch logs for errors

### Voice commands not working
- Ensure device names are clear and distinct
- Check that the device type is supported
- Verify the skill is enabled in the Alexa app

### State not updating
- State updates require polling (every 3 seconds when device is open in app)
- Check Domoticz is accessible from Lambda
- Review CloudWatch logs for errors

## Development

### Local Testing

Test discovery:
```bash
node test-discovery.js
```

Test device control:
```bash
node test-control.js
```

### Logging

CloudWatch logs show:
- Incoming Alexa requests
- Domoticz API calls
- Device state queries
- Errors and responses

View logs:
```bash
aws logs tail /aws/lambda/domoticz-alexa --follow
```

## Architecture

```
Alexa Cloud
    ↓
AWS Lambda (Node.js)
    ↓
Domoticz API (HTTPS)
    ↓
Domoticz Devices
```

The Lambda function acts as a bridge between Alexa's Smart Home API and Domoticz's JSON API.

## Files

- `domapi.js` - Main Lambda handler
- `domo-code/Discovery.js` - Device discovery
- `domo-code/Control.js` - Device control and state reporting
- `domo-code/get_Devices.js` - Domoticz device mapping
- `domo-code/domoticz.js` - Domoticz API client
- `conf.json` - Configuration file

## License

This project is provided as-is for personal use.

## Contributing

Contributions are welcome! Please test thoroughly before submitting pull requests.

## Credit

This is based on the original [alexa_domo](https://github.com/madgeni/alexa_domo) project from Nick Madge.
