# g90tog91conversion README

A VSCode extension to convert G90 G-Code into G91 format.

## Features

Converts selected G-Code with absolute positioning (G90) into G-Code that uses relative positioning (G91).

## Requirements

The selected code should have movement commands without extrusions that include the (absolute) starting values for XYZ. 
For example, a command like "G0 X50 Y60 Z0.2 F1200" that has values for X Y and Z, but no E.

Best starting point is likely when switching layers, or after the intial extrusion that primes the nozzle. 

## Release Notes

### 1.0.0

Initial release of G90toG91Conversion