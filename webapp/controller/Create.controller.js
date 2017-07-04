sap.ui.define([
	"sms/controller/BaseController",
	"sap/ui/core/routing/History",
	"sap/m/MessageToast",
	"sap/m/MessageBox"
], function(BaseController, History, MessageToast, MessageBox) {
	"use strict";

	var marker;
	var map;
	var task;
	var watch;

	return BaseController.extend("sms.controller.Create", {

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf sms.view.view.Create
		 */
		onInit: function() {
			//Register to the create route matched
			this.getRouter().getRoute("create").attachPatternMatched(this._onRouteMatched, this);
		},

		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf sms.view.view.Create
		 */
			onBeforeRendering: function() {
				this.getView().getModel("task").refresh();
				var oDataModel = this.getView().getModel("task").oData
			},
		
		
		_onRouteMatched: function(){
			var oModel = this.getModel("taskData");
			this.getView().setModel(oModel, "task");
			
		},
		
		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf sms.view.view.Create
		 */
		onAfterRendering: function() {
			this.cleanUpView();
			$('.sapUiIcon.sapUiIconMirrorInRTL.sapUiIconPointer').css('bottom', window.outerHeight / 2);
			var that = this;
			task = this.getView().getModel("task").oData;
			if (this.geocoder === "" || this.geocoder === undefined) {
				this.geocoder = new google.maps.Geocoder();
				window.mapOptions = {
					center: new google.maps.LatLng(27.703641, 85.308205),
					zoom: 17,
					mapTypeId: google.maps.MapTypeId.ROADMAP
				};
				map = new google.maps.Map(this.getView().byId("create-service-map").getDomRef(), window.mapOptions);
				watch = navigator.geolocation.watchPosition(function(position) {
					var pos = {};
					if (task.LATITUDE !== '' && task.LATITUDE !== 'undefined' && task.LONGITUDE !== '' && task.LONGITUDE !== 'undefined') {
						pos = {
							lat: parseFloat(task.LATITUDE),
							lng: parseFloat(task.LONGITUDE)
						};
					} else {
						pos = {
							lat: position.coords.latitude,
							lng: position.coords.longitude
						};
					}
					if (task.ID !== '' && task.ID !== 'undefined') {
						that.setMarker(pos);
					}
					map.setCenter(pos);
					map.panTo(pos);

				}, function(error) {
					console.log("Error: The Geolocation service failed.")
					console.log(error)
				}, {
					enableHighAccuracy: true,
					maximumAge: 10e3,
					timeout: 20e3
				});
				this.mapEvents();
				this.getCurrentLocation();
			}
		},
		
		/**
		 * Handlers for all the google map events
		 * @author dipak
		 */
		mapEvents: function() {
			var that = this;
			google.maps.event.addListener(map, "click", function(e) {
				var latitude = e.latLng.lat(); //calculates latitude of the point of click
				var longitude = e.latLng.lng() //calculates longitude of the point of click
				var pos = {
					lat: latitude,
					lng: longitude
				};
				task.LATITUDE = parseFloat(latitude).toPrecision(8);
				task.LONGITUDE = parseFloat(longitude).toPrecision(8);
				that.setMarker(pos);
				that.setAddress(task.LATITUDE, task.LONGITUDE);
			});
			setTimeout(() => {
				var addressField = that.getView().byId('addressField').getDomRef().firstChild;
				var autocomplete = new google.maps.places.Autocomplete(addressField);
				google.maps.event.addListener(autocomplete, 'place_changed', function () {
	                var place = autocomplete.getPlace();
	                if (place.geometry) {
	                    var latitude = place.geometry.location.lat();
	                    var longitude = place.geometry.location.lng();
	                    var pos = {
		    				lat: latitude,
		    				lng: longitude
		    			};
	                    task.LATITUDE = parseFloat(latitude).toPrecision(8);
	    				task.LONGITUDE = parseFloat(longitude).toPrecision(8);
	    				that.setMarker(pos);
	                    that.setAddressFieldFromGoogleObject(place); 
	                }
	            });
			}, 1000);
			
			google.maps.event.addListenerOnce(map, 'idle', function () {
				google.maps.event.trigger(map, 'resize');
			});

		},

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf sms.view.view.Create
		 */
		onExit: function() {
			this.cleanUpView();
		},

		_onRouteMatched: function() {

		},
		
		/**
		 * Used to get street address after latitude and longitude is obtained
		 * @author dipak
		 */
		setAddress: function(latitude, longitude) {
			var that = this;
			$.ajax({
				url: "https://maps.googleapis.com/maps/api/geocode/json?latlng=" + latitude + "," + longitude + "&sensor=true",
				method: "GET",
				success: function(response) {
					if (response.results.length > 0) {
						var result = response.results[0];
						that.setAddressFieldFromGoogleObject(result); 
					}
				},
				dataType: "JSON"
			});
		},
		
		setAddressFieldFromGoogleObject: function(addressObject){
			task.ADDRESS = addressObject.formatted_address;
			for (var i = 0; i < addressObject.address_components.length; i++) {
				if ($.inArray("street_number", addressObject.address_components[i].types) !== -1) {
					task.STREET_NUM = addressObject.address_components[i].long_name;
				} else if ($.inArray("route", addressObject.address_components[i].types) !== -1) {
					task.STREET_NAME = addressObject.address_components[i].long_name;
				} else if ($.inArray("administrative_area_level_1", addressObject.address_components[i].types) !== -1) {
					task.STATE = addressObject.address_components[i].long_name;
				} else if ($.inArray("administrative_area_level_2", addressObject.address_components[i].types) !== -1) {
					task.REGION = addressObject.address_components[i].long_name;
				} else if ($.inArray("country", addressObject.address_components[i].types) !== -1) {
					task.COUNTRY = addressObject.address_components[i].long_name;
				}
			}
			this.getView().getModel("task").refresh();
		},
		
		setMarker: function(pos){
			if (marker) {
				marker.setMap(null);
			}
			marker = new google.maps.Marker({
				map: map,
				position: pos,
				icon: 'image/map-pin.png'
			});
			map.setCenter(pos);
			map.panTo(pos);
		},
		
		/**
		 * Handler for create/update button event
		 * @author
		 */
		onCreate: function() {
			var that = this;
			var data = {
				"ID": task.ID,
				"DESCRIPTION": task.DESCRIPTION,
				"COUNTRY": task.COUNTRY,
				"STREET_NAME": task.STREET_NAME,
				"STREET_NUM": task.STREET_NUM,
				"STATE": task.STATE,
				"REGION": task.REGION,
				"APARTMENT": task.APARTMENT,
				"ADDRESS": task.ADDRESS,
				"LATITUDE": task.LATITUDE,
				"LONGITUDE": task.LONGITUDE,
				"LOCATION_ID": task.LOCATION_ID,
				"SERVICE_CATEGORY_ID": task.SERVICE_CATEGORY_ID,
				"SERVICE_TYPE_ID": task.SERVICE_TYPE_ID,
				"STATUS_ID": task.STATUS_ID,
				"CUSTOMER_ID": task.CUSTOMER_ID
			};
			console.log(task)
			if (that.checkNotEmptyAndNotNull(task.DESCRIPTION) && that.checkNotEmptyAndNotNull(task.LATITUDE) && that.checkNotEmptyAndNotNull(task.LONGITUDE)) {
				$.ajax({
					type: "POST",
					url: "../service/srService.xsjs",
					data: JSON.stringify(data),
					async: true
				}).done(function(response) {
					MessageToast.show("Created successfully");
					console.log(response);
					that.navToObjectDetails(response.ID);
				}).fail(function(error) {
					var bCompact = !!that.getView().$().closest(".sapUiSizeCompact").length;
					MessageBox.error(
						error, {
							styleClass: bCompact ? "sapUiSizeCompact" : ""
						}
					);
				});
			} else {
				var bCompact = !!that.getView().$().closest(".sapUiSizeCompact").length;
				MessageBox.error(
					"Missing Fields. Validation Failed.", {
						styleClass: bCompact ? "sapUiSizeCompact" : ""
					}
				);
			}
			

		},
		
		checkNotEmptyAndNotNull : function(value){
			return value !== undefined && value !== null && value !== '' ? true : false;
		},
		
		/**
		 * Gets current location in the google map
		 * @author dipak
		 */
		getCurrentLocation: function() {
			var that = this;
			if (navigator.geolocation) {
				navigator.geolocation.getCurrentPosition(function(position){
					var pos = {
							lat: position.coords.latitude,
							lng: position.coords.longitude
						};
						if (marker) {
							marker.setMap(null);
						}
						task.LATITUDE = parseFloat(pos.lat).toPrecision(8);
						task.LONGITUDE = parseFloat(pos.lng).toPrecision(8);
						that.setMarker(pos);
						that.setAddress(task.LATITUDE, task.LONGITUDE);
				}, function(error){
					var bCompact = !!that.getView().$().closest(".sapUiSizeCompact").length;
					MessageBox.error("Failed to get current location",{
						styleClass: bCompact ? "sapUiSizeCompact" : ""
					});
				}, {
					enableHighAccuracy: true,
					timeout: 60000,
					maximumAge: 0
				});
			} else {
				// Browser doesn't support Geolocation
				MessageBox.error("Browser doesn't support Geolocation");
			}
		},
		
		navBack: function() {
			var oHistory = History.getInstance(),
				sPreviousHash = oHistory.getPreviousHash();
			this.cleanUpView();
			if (sPreviousHash !== 'undefined') {
				history.go(-1);
			} else {
				var bReplace = true;
				this.getRouter.navTo("worklist", {}, bReplace);
			}
		},

		navToObjectDetails: function(ID) {
			this.cleanUpView();
			this.getRouter().navTo("object", {
				objectId: ID
			});
		},
		
		/**
		 * Used to remove previously created google map instance 
		 * @author dipak
		 */
		cleanUpView: function() {
			this.geocoder = "";
			map = null;
			this.clearWatch();
		},
		
		clearWatch: function() {
			if (watch !== null) {
				navigator.geolocation.clearWatch(watch);
				watch = null;
			}
		}
	});

});