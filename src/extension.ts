// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import path = require('path');
import { TextEncoder } from 'util';

import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let conversion = vscode.commands.registerCommand('g90tog91conversion.convertG90', function () {
		if (vscode.window.activeTextEditor === undefined) {
			vscode.window.showInformationMessage('Error: No active text editor found.');
			return;
		}
		const editor = vscode.window.activeTextEditor;
		const selection = editor.selection;
		const text = editor.document.getText(selection);

		
		let lines = text.split('\n');

		// Determine absolute or relative extruder mode automatically(heuristically)
		// Will probably just use M82/M83 if necessary. Printers seem to handle E independent from XYZ though, so probably no need. 
		/*
		var [cumulativeE,cumulativeDiff,cumulativePos,averageE,averageDiff,averagePosDiff,extrusion,lastE] = [0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0];
		var [extrusionCount,incCount,maxCount,posCount,zeroCount] = [0,0,0,0,0];
		let first = true;
		lines.forEach(function (line) {  
			var copyLine = (' ' + line).slice(1);
			line.split(';', 1);
			const commented = line.indexOf(';');
			const preCommentLine = line.split(';')[0];
			var g92 = false;
			if (preCommentLine.length > 0) {
				var parts = preCommentLine.split(' ');
				parts.forEach(function (part) {
					if (part === 'G92' || part === 'g92') {
						g92 = true;
					}
					if (part[0] === 'E' || part[0] === 'e') {
						extrusionCount++;
						if (g92) {
							lastE = parseFloat(part.substring(1));
						}
						else {
							extrusion = parseFloat(part.substring(1));
							cumulativeE += extrusion;
							let diff = (extrusion-lastE);
							cumulativeDiff += diff;

							if (diff > 0) {
								cumulativePos += diff;
								posCount++;
							} else if (diff === 0) {
								zeroCount++;
							} else {
							}

							if (extrusion > 0 && diff < 0)

							lastE = extrusion;

						}
					}
				});
			}
		});  

		averageE = cumulativeE / extrusionCount;
		averageDiff = cumulativeDiff / extrusionCount;
		*/

		let newText = '';
		let [move,g92,g92Warn,error,g91active] = [false,false,false,false,false];
		let [xMiss,yMiss,zMiss,firstLine] = [true,true,true,true];
		var lastCoords = {x:Infinity,y:Infinity,z:Infinity,e:Infinity};

		// Generate output text line by line
		lines.forEach(function (line) {
			if (!error) {
				var coords = {x:Infinity,y:Infinity,z:Infinity,e:Infinity}; // Infinity as "unchanged" boolean
				var remainingPartString = '';
				g92 = false; 
				move = false;
				const preCommentLine = line.split(';')[0];
				if (preCommentLine.length > 0) {
					var parts = preCommentLine.split(' ');
					if (parts[0] === 'G0' || parts[0] === 'G1' || parts[0] === 'g0' || parts[0] === 'g1') {
						move = true;
					}
					if (parts[0] === 'G92' || parts[0] === 'g92') {
						g92 = true;
					}
					if (move || g92) {
						parts.shift(); // Skip G-command-part
						if (parts.length > 0) {
							parts.forEach(function (part) {
								if (part[0] === 'X' || part[0] === 'x') {
									coords.x = parseFloat(part.substring(1));
									xMiss = false;
									if (g92) {
										g92Warn = true;
									}
								}
								else if (part[0] === 'Y' || part[0] === 'y') {
									coords.y = parseFloat(part.substring(1));
									yMiss = false;
									if (g92) {
										g92Warn = true;
									}
								}
								else if (part[0] === 'Z' || part[0] === 'z') {
									coords.z = parseFloat(part.substring(1));
									zMiss = false;
									if (g92) {
										g92Warn = true;
									}
								}
								else if (part[0] === 'E' || part[0] === 'e') {
									// Can't calculate the relative positions if no absolute starting position is known --> Skip execution with warning
									if ((xMiss || yMiss || zMiss) && !error && move) {
										error = true;
										vscode.window.showInformationMessage('Error: Extrusion found before XYZ-position fully defined!');
									}
									coords.e = parseFloat(part.substring(1));
								}

								// remaining parts that need no handling
								else {
									remainingPartString = remainingPartString + ' ' + part;
								}
							});
						}
					}
				}


				// New line handling for neat first line replacement 
				if (firstLine) {
					firstLine = false;
				}
				else {
					newText += '\n';
				}

				// Calculate and apply new output if required 
				if (move && g91active) {
					var newLine = line.split(';')[0].split(' ')[0];
					
					if (coords.x !== Infinity) { // TODO: Refactor this repetitive mess
						newLine = newLine + ' X' + (coords.x - lastCoords.x).toFixed(3);
						lastCoords.x = coords.x;
					}
					if (coords.y !== Infinity) {
						newLine = newLine + ' Y' + (coords.y - lastCoords.y).toFixed(3);
						lastCoords.y = coords.y;
					}
					if (coords.z !== Infinity) {
						newLine = newLine + ' Z' + (coords.z - lastCoords.z).toFixed(3);
						lastCoords.z = coords.z;
					}
					if (coords.e !== Infinity) {
						newLine = newLine + ' E' + coords.e.toFixed(5);
						lastCoords.e = coords.e;
					}

					// maintain unchanged parts
					newLine += remainingPartString;

					// maintain commented out parts
					const commentPos = line.indexOf(';'); // TODO: Beautify
					if (commentPos > -1) {
						const comment = line.substring(commentPos);
						newLine += comment;
					}

					// add results to output
					newText += newLine;
				}
				else {
					newText += line;
				}

				if (!(xMiss || yMiss || zMiss) && !g91active) {
					g91active = true;
					lastCoords = coords;
					newText += '\n\nG91; Switching to relative XYZ positioning!\n';
				}

			}
		});  

		if (g91active) {
			newText += '\n\nG90; Returning to absolute XYZ positioning!\n';
		}
		
		// const newText = "console.log('" + text + "', " + text + ")";
		if (!error) {
			editor?.edit(builder => builder.replace(selection, newText));
		} 
		if (g92Warn) {
			vscode.window.showInformationMessage('Warning: G92 code used to reset XYZ axes. Output likely compromised!');
		}
	});

	context.subscriptions.push(conversion);
}

exports.activate = activate;

// This method is called when your extension is deactivated
export function deactivate() {}
exports.deactivate = deactivate;