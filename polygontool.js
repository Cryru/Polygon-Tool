$(start);

console.log("Loaded Polygon Tool Version 3.1");
console.log("Repository: https://github.com/Cryru/Polygon-Tool")
console.log("SoulEngine Repository: https://github.com/Cryru/SoulEngine")

function start() {
	// Create the canvas and style it.
	let canvas = $("#drawarea");
	canvas.css('background', 'lightgray');
	canvas.css('width', '100%');
	canvas.css('height', '75%');
	canvas.attr('width', '960px');
	canvas.attr('height', '540px');

	// Get the canvas context.
	let context = canvas[0].getContext("2d");

	trackTransforms(context);

	// Create mini functions.
	let undo = () => {
		list = list.slice(0, list.length - 1);
		update();
	};
	let clearList = () => {
		list = [];
		update();
	};
	let addPoint = () => {
		let pos = getMousePos(canvas[0], e);
		list.push(pos);
		update();
	};

	// Hook up events.
	$("#backbutton").click(undo);
	$("#resetbutton").click(clearList);
	$("#file").change(updateImage);
	$(document).keydown(buttonEvent);
	$("#image")[0].onload = update;
	$("#vertname").val("vert").keyup(update);
	$("#sePolygon").change(update);
	$("#asArray").change(update);
	$("#resetview").click(() => { context.setTransform(1, 0, 0, 1, 0, 0); update(); });
	$(canvas).mousedown(mouseClick);
	$(canvas).mousemove(mouseMoved);
	$(canvas).mouseup(mouseUp);
	$(canvas).bind('mousewheel', mouseScrolled);
	// Get the origin point, which is the center.
	let origin = { x: canvas[0].width / 2, y: canvas[0].height / 2 };
	let transformedOrigin = context.transformedPoint(origin.x, origin.y);

	// Let underlay variables.
	let underlayX = 0;
	let underlayY = 0;
	let moveUnderlay = false;

	// Transformation variables.
	let last = Object.assign({}, origin);
	let dragStart;
	let dragged = false;

	// Transformation events.
	canvas = canvas[0];
	var p1 = context.transformedPoint(0, 0);
	var p2 = context.transformedPoint(canvas.width, canvas.height);
	var scaleFactor = 1.1;

	// Define the points lists.
	let list = [];
	let listOffset = [];

	// Update and start drawing.
	update();

	// The function to handle clicking with the mouse. Handles moving the view, putting points, and ending underlay moving.
	function mouseClick(evt) {
		if (evt.button == 1) { // Middle mouse click.
			document.body.style.mozUserSelect = document.body.style.webkitUserSelect = document.body.style.userSelect = 'none';
			last.X = evt.offsetX || (evt.pageX - canvas.offsetLeft);
			last.Y = evt.offsetY || (evt.pageY - canvas.offsetTop);
			dragStart = context.transformedPoint(last.X, last.Y);
			dragged = false;
		} else if (evt.button == 0 && !moveUnderlay) { // Left click and not moving the underlay.
			list.push(getMousePos(evt));
			update();
		} else if (evt.button == 0 && moveUnderlay) { // Left click and moving the underlay.
			moveUnderlay = false;
		}
	}

	// The function to handle moving the mouse. Handles moving the view and the underlay.
	function mouseMoved(evt) {
		last.X = evt.offsetX || (evt.pageX - canvas.offsetLeft);
		last.Y = evt.offsetY || (evt.pageY - canvas.offsetTop);
		dragged = true;
		if (dragStart) {
			var pt = context.transformedPoint(last.X, last.Y);
			context.translate(pt.x - dragStart.x, pt.y - dragStart.y);
			update();
		} else if (moveUnderlay) {
			let location = getMousePos(evt);

			underlayX = location.x - $("#image")[0].naturalWidth / 2;
			underlayY = location.y - $("#image")[0].naturalHeight / 2;
			update();
		}
	}

	// The function to handle letting go of the mouse. Handles stopping dragging.
	function mouseUp(evt) {
		// Middle mouse let go.
		if (evt.button == 1) {
			dragStart = null;
		}
	}

	// Handles the mouse being scrolled. Handles zooming.
	function mouseScrolled(evt) {
		evt = evt.originalEvent;

		let zoom = (clicks) => {
			// Check if too zoomed out.
			let currentTransform = context.getTransform();
			if (currentTransform.a >= 3 && clicks > 0) {
				return;
			}

			var pt = context.transformedPoint(last.X, last.Y);
			context.translate(pt.x, pt.y);
			var factor = Math.pow(scaleFactor, clicks);
			context.scale(factor, factor);

			// Check if too zoomed in.
			currentTransform = context.getTransform();
			if (currentTransform.a <= 1) {
				context.setTransform(1, currentTransform.b, currentTransform.c, 1, currentTransform.e, currentTransform.f);
			}
			context.translate(-pt.x, -pt.y);

			update();
		}

		var delta = evt.wheelDelta ? evt.wheelDelta / 40 : evt.detail ? -evt.detail : 0;
		if (delta) zoom(delta);
		return evt.preventDefault() && false;
	}

	// Updates the canvas.
	function update() {
		// Clear the canvas
		context.clearRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
		context.save();
		context.setTransform(1, 0, 0, 1, 0, 0);
		context.clearRect(0, 0, canvas.width, canvas.height);
		context.restore();

		// Clear the export data.
		$("#exportbox").val("");

		// Reset the calculated offset list.
		listOffset = [];

		// Get the image underlay and underlay it.
		let bgimg = document.getElementById("image");
		context.drawImage(bgimg, underlayX, underlayY);

		// Draw the origin.
		context.fillStyle = "rgb(200,0,0)";
		context.fillRect(transformedOrigin.x, transformedOrigin.y, 4, 4);
		context.fillStyle = "rgb(0,0,0)";

		// Draw the points from the list.
		for (var i = 0; i < list.length; i++) {

			// Draw the current point.
			context.fillRect(list[i].x, list[i].y, 4, 4);

			// Find the previous point, and if such a point exists draw a line between the current one and it.
			if (list[i - 1] != undefined) {
				context.beginPath();
				context.moveTo(list[i - 1].x + 2, list[i - 1].y + 2);
				context.lineTo(list[i].x + 2, list[i].y + 2);
				context.stroke();
			}

			// While we are here generate an offset point for each point.
			// An offset point is the point's location relative to the shape origin rather than the top left corner which is the canvas origin.
			let offsetPos = { x: (list[i].x - origin.x) * -1, y: (list[i].y - origin.y) * -1 }
			listOffset.push(offsetPos);
		}

		// Draw the wraparound line. That's the line between the last and first point.
		if (list.length > 1) {
			context.beginPath();
			context.moveTo(list[0].x + 2, list[0].y + 2);
			context.lineTo(list[list.length - 1].x + 2, list[list.length - 1].y + 2);
			context.stroke();
		}

		// Get mode, physics polygon or SE 2018 Polygon.
		let isRayaPolygon = $("#sePolygon")[0].checked;
		// Get whether we are exporting as an array or a list as is default.
		let asArray = $("#asArray")[0].checked;

		// Generate the export text.
		let exporttext = [];

		// If an array add the array header.
		if (asArray) { exporttext = "Vector2[] " + $("#vertname").val() + " = {"; } else {
			exporttext.push("List<Vector2> " + $("#vertname").val() + " = new List<Vector2>();");
		}

		for (var i = 0; i < listOffset.length; i++) {
			let x = Math.round(listOffset[i].x);
			let y = Math.round(listOffset[i].y);

			// Raya shapes are inverted.
			if (isRayaPolygon) {
				x *= -1;
				y *= -1;
			}

			if (asArray) {
				exporttext += "new Vector2(" + x + "," + y + ")";

				if (i != listOffset.length - 1) {
					exporttext += ", ";
				}
			} else {
				exporttext.push($("#vertname").val() + ".Add(new Vector2(" + x + "," + y + "));");
			}
		}

		if (asArray) {
			// Close the bracket.
			exporttext += "};";
		}
		else {
			// Convert to lines.
			exporttext = exporttext.join('\n');
		}

		// Put the text in the text field for exporting.
		$("#exportbox").val(exporttext);
	}

	// Returns the position of the mouse.
	function getMousePos(evt) {
		var rect = canvas.getBoundingClientRect();
		let clickLocation = {
			x: Math.round((evt.clientX - rect.left) / (rect.right - rect.left) * canvas.width),
			y: Math.round((evt.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height)
		};

		return context.transformedPoint(clickLocation.x, clickLocation.y);
	}

	// Updates the underlay image.
	function updateImage() {
		let file = $("#file")[0].files[0];

		let reader = new FileReader();
		reader.addEventListener("load", createFileLoader);
		reader.readAsDataURL(file);

		// Set the image to the image attribute once it's loaded.
		function createFileLoader(d) {
			let image64 = d.target.result.slice(d.target.result.indexOf(",") + 1);
			let imageData = { image: image64 };

			$('#image').attr("src", d.target.result);

			moveUnderlay = true;
		}
	}

	// Handles hotkeys.
	function buttonEvent(e) {
		if (e.key == "z" && e.ctrlKey == true) {
			undo();
		}
	}
}
