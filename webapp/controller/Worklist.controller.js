sap.ui.define([
	"sms/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sms/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageToast",
	"sap/m/MessageBox"
], function(BaseController, JSONModel, formatter, Filter, FilterOperator, MessageToast, MessageBox) {
	"use strict";
	var positionMarkers = [];
	var map;
	var infowindow;
	var watch;
	var drawingManager, polygon, limit = 5,
		offset = 0;

	return BaseController.extend("sms.controller.Worklist", {

		formatter: formatter,


		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
		onInit: function() {
			var oViewModel,
				iOriginalBusyDelay,
				oTable = this.byId("table");

			// Put down worklist table's original value for busy indicator delay,
			// so it can be restored later on. Busy handling on the table is
			// taken care of by the table itself.
			iOriginalBusyDelay = oTable.getBusyIndicatorDelay();
			// keeps the search state
			this._oTableSearchState = [];

			// Model used to manipulate control states
			oViewModel = new JSONModel({
				worklistTableTitle: this.getResourceBundle().getText("worklistTableTitle"),
				shareOnJamTitle: this.getResourceBundle().getText("worklistTitle"),
				shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailWorklistSubject"),
				shareSendEmailMessage: this.getResourceBundle().getText("shareSendEmailWorklistMessage", [location.href]),
				tableNoDataText: this.getResourceBundle().getText("tableNoDataText"),
				tableBusyDelay: 0
			});
			this.setModel(oViewModel, "worklistView");

			// Make sure, busy indication is showing immediately so there is no
			// break after the busy indication for loading the view's meta data is
			// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
			oTable.attachEventOnce("updateFinished", function() {
				// Restore original busy indicator delay for worklist's table
				oViewModel.setProperty("/tableBusyDelay", iOriginalBusyDelay);
			});
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Triggered by the table's 'updateFinished' event: after new table
		 * data is available, this handler method updates the table counter.
		 * This should only happen if the update was successful, which is
		 * why this handler is attached to 'updateFinished' and not to the
		 * table's list binding's 'dataReceived' method.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onUpdateFinished: function(oEvent) {
			// update the worklist's object counter after the table update
			var sTitle,
				oTable = oEvent.getSource(),
				iTotalItems = oEvent.getParameter("total");
			// only update the counter if the length is final and
			// the table is not empty
			if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
			} else {
				sTitle = this.getResourceBundle().getText("worklistTableTitle");
			}
			this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);
		},

		/**
		 * Event handler when a table item gets pressed
		 * @param {sap.ui.base.Event} oEvent the table selectionChange event
		 * @public
		 */
		onPress: function(oEvent) {
			// The source is the list item that got pressed
			this._showObject(oEvent.getSource());
		},

		/**
		 * Event handler for navigating back.
		 * We navigate back in the browser historz
		 * @public
		 */
		onNavBack: function() {
			history.go(-1);
		},

		onSearch: function(oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				// Search field's 'refresh' button has been pressed.
				// This is visible if you select any master list item.
				// In this case no new search is triggered, we only
				// refresh the list binding.
				this.onRefresh();
			} else {
				var oTableSearchState = [];
				var sQuery = oEvent.getParameter("query");

				if (sQuery && sQuery.length > 0) {
					oTableSearchState = [new Filter("TASK_DESCRIPTION", FilterOperator.Contains, sQuery)];
				}
				this._applySearch(oTableSearchState);
			}

		},

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh: function() {
			var oTable = this.byId("table");
			oTable.getBinding("items").refresh();
			this.getView().byId("pullToRefresh").hide();
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * Shows the selected item on the object page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		_showObject: function(oItem) {
			var id = oItem.getBindingContext().getProperty("ID");
			this.navigateTo(id);
		},
		
		navigateTo: function(id) {
			this.getRouter().navTo("object", {
				objectId: id
			});
		},
		
		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @param {object} oTableSearchState an array of filters for the search
		 * @private
		 */
		_applySearch: function(oTableSearchState) {
			var oTable = this.byId("table"),
				oViewModel = this.getModel("worklistView");
			oTable.getBinding("items").filter(oTableSearchState, "Application");
			// changes the noDataText of the list in case there are no filter results
			if (oTableSearchState.length !== 0) {
				oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
			}
		},

		/**
		 * Event handler when create button is pressed
		 * @public
		 */
		onCreateButtonPress: function() {
			this.removeMap();
			var taskModel = this.getView().getModel("task");
			taskModel.oData = {
				"ID": "",
				"DESCRIPTION": "",
				"STATUS_ID": "",
				"SERVICE_TYPE_ID": "",
				"CUSTOMER_ID": "",
				"SERVICE_CATEGORY_ID": "",
				"TASK_REQUESTED_DATE": "",
				"COUNTRY": "",
				"STREET_NAME": "",
				"STREET_NUM": "",
				"STATE": "",
				"REGION": "",
				"APARTMENT": "",
				"LATITUDE": "",
				"LONGITUDE": "",
				"LOCATION_ID": ""
			};
			this.getRouter().navTo("create");
		},

		onAfterRendering: function(event) {
			console.log(event)
			console.log(event.getSource())
		},

		setMarker: function(pos) {
			var marker = new google.maps.Marker({
				map: map,
				position: pos,
				icon: 'image/push-pin.png'
			});
			markers.push(marker);
		},

		displayMap: function(oEvent) {
			if (!this.geocoder) {
				this.geocoder = new google.maps.Geocoder();
				window.mapOptions = {
					center: new google.maps.LatLng(27.0001, 87.991),
					zoom: 12,
					mapTypeId: google.maps.MapTypeId.ROADMAP
				};
				map = new google.maps.Map(this.getView().byId("worklist-map").getDomRef(), window.mapOptions);
				
				google.maps.event.addListener(map, "click", function(e) {
					var latitude = e.latLng.lat(); //calculates latitude of the point of click
					var longitude = e.latLng.lng() //calculates longitude of the point of click
					var pos = {
						lat: latitude,
						lng: longitude
					};
					console.log("clicked");
						
				});
				
				watch = navigator.geolocation.watchPosition(function(position) {
					var pos = {
						lat: position.coords.latitude,
						lng: position.coords.longitude
					};
					map.setCenter(pos);
				}, function(error) {
					console.log(error)
					MessageToast.show('Error: The Geolocation service failed.');
				}, {
					enableHighAccuracy: true,
					maximumAge: 10e3,
					timeout: 20e3
				});
	
				this.drawShapes();
			}
		},

		drawShapes: function() {
			drawingManager = new google.maps.drawing.DrawingManager({
				drawingControl: true,
				drawingControlOptions: {
					position: google.maps.ControlPosition.TOP_CENTER,
					drawingModes: ['polygon']
				}
			});
			drawingManager.setMap(map);
			var that = this;
			google.maps.event.addListener(drawingManager, 'polygoncomplete', function(polygonShape) {
				that.getView().byId("lazyLoadTaskDetail").setVisible(false);
				that.getView().byId("loadTaskDetail").setVisible(true);
				offset = 0;
				that.deletePolygon();
				polygon = polygonShape;

				var vertices = polygonShape.getPath();
				var positions = [];
				// Iterate over the vertices.
				for (var i = 0; i < vertices.getLength(); i++) {
					var latLong = vertices.getAt(i);
					var position = {
						latitude: latLong.lat(),
						longitude: latLong.lng()
					};
					positions.push(position);
				}
				//Closing the polygon
				positions.push(positions[0]);
				that.getTasksInPolygon(positions, that.markLocations, that);

			});
		},

		getTasksInPolygon: function(positionArray, callback, that) {
			console.log(positionArray)
			var removeMarkers = true;
			var that = this;
			 $.ajax({
			 	type: "POST",
			 	url: "../service/getTaskFromLocation.xsjs",
			 	data: JSON.stringify(positionArray),
			 	async: true
			 }).done(function(response) {
			 	if (callback !== 'undefined') {
			 		callback(response, that, removeMarkers);
			 	}
			 }).error(function(error) {
			 	var bCompact = !!that.getView().$().closest(".sapUiSizeCompact").length;
			 	MessageBox.error(
			 		"Failed to get tasks in this area.", {
			 			styleClass: bCompact ? "sapUiSizeCompact" : ""
			 		}
			 	);
			 });
		},

		markLocations: function(taskDetails, that, removeMarkers) {
			if (removeMarkers) {
				that.removeOldMarkers();
			}
			var tasks = taskDetails.tasks;
			for (var i = 0; i < tasks.length; i++) {
				var infoWindowContent = tasks[i].TASK_DESCRIPTION;
				that.setTaskMarker({
					lat: tasks[i].LATITUDE,
					lng: tasks[i].LONGITUDE
				}, infoWindowContent);
			}
		},

		setTaskMarker: function(pos, infoWindowContent) {
			var marker = new google.maps.Marker({
				map: map,
				position: pos,
				icon: 'image/map-pin.png',
				title: 'Task'
			});
			var headerString = "<div style='margin-bottom:5px; font-size:15px;'>Service Requests in this location</div>"
			var that = this;
			marker.addListener('click', function(event) {
				var latitude = this.position.lat();
				latitude = parseFloat(latitude).toPrecision(8);
				var longitude = this.position.lng();
				longitude = parseFloat(longitude).toPrecision(8);
				infoWindowContent = that.getTaskForLocation(latitude, longitude);
				
				infowindow = new google.maps.InfoWindow({
					content:headerString+infoWindowContent
				});
				google.maps.event.addListener(infowindow, 'domready', function() {
				    var infowindows = document.getElementsByClassName("info-window-description");
				    Array.prototype.filter.call(infowindows, function(info){
				    	console.log(info)
				    	info.addEventListener("click", function(e) {
					        console.log("event triggered")
							var id = $(this).attr('taskid');
							that.navigateTo(id);
					    }, false);
				    });
				});
				infowindow.open(map, marker);
			});
			
			positionMarkers.push(marker);
		},

		getTaskForLocation: function(latitude, longitude) {
			var url = "../service/task.xsodata/TaskDetails/?$filter=LATITUDE eq " + latitude + " and LONGITUDE eq " + longitude;
			var taskDescriptions="<ul>";
			$.ajax({
				type: "GET",
				url: url,
				async: false,
				headers: {
					Accept: "application/json"
				}
			}).done(function(response) {
				for(var i=0; i < response.d.results.length ;i++) {
					var task = response.d.results[i];
					taskDescriptions += "<li><a href='javascript:void(0);' class='info-window-description' taskId='"+ task.ID+"'>" + task.TASK_DESCRIPTION + "</a></li>";
				}
			}).error(function(error) {
				MessageBox.error("Failed to get other tasks in this area.");
			});
			taskDescriptions += "</ul>";
			return taskDescriptions;
		},
		
		removeOldMarkers: function() {
			for (var i = 0; i < positionMarkers.length; i++) {
				positionMarkers[i].setMap(null);
				positionMarkers[i] = null;
			}
			positionMarkers = [];
		},

		deletePolygon: function() {
			if (polygon !== null && polygon !== undefined) {
				polygon.setMap(null);
				polygon = null;
			}
		},

		showEvent: function(event) {
			console.log(event.getSource().getSelectedKey().includes("spatialView"))
			if (event.getSource().getSelectedKey().includes("spatialView")){
				this.removeMap();
				offset = 0;
				this.displayMap();
				this.getTaskDetails();
			}
		},
		
		removeMap: function(){
			if(watch !== null && watch !== undefined && watch !== "") {
				navigator.geolocation.clearWatch(watch);
				watch = null;
			}
			this.geocoder = "";
			map = null;
		},
		
		viewAll: function() {
			this.getView().byId("lazyLoadTaskDetail").setVisible(true);
			this.getView().byId("loadTaskDetail").setVisible(false);
			this.deletePolygon();
			this.getTaskDetails();
		},

		getTaskDetails: function() {
			var that = this;
			 var url = "../service/getTaskFromLocation.xsjs?limit=" + limit + "&offset=" + offset;
			 $.ajax({
			 	type: "GET",
			 	url: url,
			 	async: true
			 }).done(function(response) {
				 if (response.tasks.length > 0) {
					 offset += limit;
				 }
				if (response.tasks.length < limit ) {
					that.getView().byId("lazyLoadTaskDetail").setVisible(false);
					that.getView().byId("loadTaskDetail").setVisible(false);
			 }
			 	that.markLocations(response, that);
			 }).error(function(error) {
			 	var bCompact = !!that.getView().$().closest(".sapUiSizeCompact").length;
			 	MessageBox.error(
			 		"Failed to get tasks in this area.", {
			 			styleClass: bCompact ? "sapUiSizeCompact" : ""
			 		}
			 	);
			 });
		}
	});
});