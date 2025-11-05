# Blind Support Enhancement

## Summary

Enhanced blind support to use Alexa's RangeController interface instead of PowerController + PercentageController. This provides better voice control and aligns with Alexa's recommended interface for blinds.

## Changes Made

### 1. Discovery (get_Devices.js)

**Before:**
- Blinds exposed PowerController (on/off) and PercentageController (0-100%)
- Required two separate commands for different control types

**After:**
- Blinds now use RangeController with "Blind.Lift" instance
- Includes presets for "Open" (100) and "Close" (0)
- Uses Alexa's built-in assets for better voice recognition
- Single unified interface for all blind control

### 2. Control (Control.js)

**Added:**
- New `Alexa.RangeController` case handler
- Supports `SetRangeValue` directive (set to specific position)
- Supports `AdjustRangeValue` directive (raise/lower by delta)
- Proper error handling and state reporting

**Updated:**
- State reporting for blinds now returns RangeController properties
- Removed PowerController and PercentageController state reporting for blinds

### 3. Voice Commands

Users can now say:
- "Alexa, open the [blind name]" → Sets to 100%
- "Alexa, close the [blind name]" → Sets to 0%
- "Alexa, set [blind name] to 50 percent" → Sets to 50%
- "Alexa, raise [blind name]" → Increases position
- "Alexa, lower [blind name]" → Decreases position

## Technical Details

### RangeController Configuration

```javascript
{
  interface: 'Alexa.RangeController',
  instance: 'Blind.Lift',
  configuration: {
    supportedRange: { minimumValue: 0, maximumValue: 100, precision: 1 },
    presets: [
      { rangeValue: 0, friendlyNames: ['Close', 'Closed'] },
      { rangeValue: 100, friendlyNames: ['Open'] }
    ]
  }
}
```

### Domoticz API Mapping

- RangeController values (0-100) are mapped to Domoticz dimmer levels
- Uses the same `Set Level` command as dimmable lights
- Respects device's MaxDimLevel setting

## Testing

Test blind control with:
```bash
node test-blind.js
```

## Benefits

1. **Better Voice Recognition**: Uses Alexa's built-in assets for "open" and "close"
2. **Unified Interface**: Single controller for all blind operations
3. **Preset Support**: Direct "open" and "close" commands without specifying percentages
4. **Standards Compliant**: Follows Alexa's recommended interface for window coverings
5. **Alexa App Integration**: Better UI in the Alexa app with slider and preset buttons

## Compatibility

- Works with Domoticz Blind and RFY device types
- Backward compatible with existing blind devices
- Requires device rediscovery in Alexa app after deployment
