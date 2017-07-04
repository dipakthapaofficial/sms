/*global location*/
sap.ui.define([
	"sms/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
	"sms/model/formatter",
	"sap/m/MessageToast"
], function(
	BaseController,
	JSONModel,
	History,
	formatter,
	MessageToast
) {
	"use strict";

	var objectMap, objectModel, watch, cleanupRequired = true;

	return BaseController.extend("sms.controller.Object", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
		onInit: function() {

			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var iOriginalBusyDelay,
				oViewModel = new JSONModel({
					busy: true,
					delay: 0
				});

			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);

			// Store original busy indicator delay, so it can be restored later on
			iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();
			this.setModel(oViewModel, "objectView");
			this.getOwnerComponent().getModel().metadataLoaded().then(function() {
				// Restore original busy indicator delay for the object view
				oViewModel.setProperty("/delay", iOriginalBusyDelay);
			});

		},

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf sms.view.view.Create
		 */
		onExit: function() {
			this.cleanUpView();
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Event handler  for navigating back.
		 * It there is a history entry we go one step back in the browser history
		 * If not, it will replace the current entry of the browser history with the worklist route.
		 * @public
		 */
		onNavBack: function() {
			var sPreviousHash = History.getInstance().getPreviousHash();
			this.cleanUpView();
			if (sPreviousHash !== undefined) {
				history.go(-1);
			} else {
				this.getRouter().navTo("worklist", {}, true);
			}
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * Binds the view to the object path.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched: function(oEvent) {
			var sObjectId = oEvent.getParameter("arguments").objectId;
			this.getModel().metadataLoaded().then(function() {
				var sObjectPath = this.getModel().createKey("TaskDetails", {
					ID: sObjectId
				});
				this._bindView("/" + sObjectPath);
			}.bind(this));
			if (cleanupRequired){
				this.cleanUpView(); 
			} else {
				cleanupRequired = true;
			}
		},

		/**
		 * Binds the view to the object path.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound
		 * @private
		 */
		_bindView: function(sObjectPath) {
			var oViewModel = this.getModel("objectView"),
				oDataModel = this.getModel();
			this.getView().bindElement({
				path: sObjectPath,
				events: {
					change: this._onBindingChange.bind(this),
					dataRequested: function() {
						oDataModel.metadataLoaded().then(function() {
							// Busy indicator on view should only be set if metadata is loaded,
							// otherwise there may be two busy indications next to each other on the
							// screen. This happens because route matched handler already calls '_bindView'
							// while metadata is loaded.
							oViewModel.setProperty("/busy", true);
						});
					},
					dataReceived: function() {
						oViewModel.setProperty("/busy", false);
					}
				}
			});
		},

		_onBindingChange: function() {
			var oView = this.getView(),
				oViewModel = this.getModel("objectView"),
				oElementBinding = oView.getElementBinding();

			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				this.getRouter().getTargets().display("objectNotFound");
				return;
			}

			var oResourceBundle = this.getResourceBundle(),
				oObject = oView.getBindingContext().getObject(),
				sObjectId = oObject.ID,
				sObjectName = oObject.TASK_DESCRIPTION;
			objectModel = oObject;
			// Everything went fine.
			oViewModel.setProperty("/busy", false);
			oViewModel.setProperty("/shareSendEmailSubject",
				oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId]));
			oViewModel.setProperty("/shareSendEmailMessage",
				oResourceBundle.getText("shareSendEmailObjectMessage", [sObjectName, sObjectId, location.href]));
		},
		
		/**
		 * This method is called after the view is rendered.
		 * Here the google map is initialized and events associated with it are attached, along with
		 * the marker for the position of the task.
		 * @author dipak
		 */
		onAfterRendering: function() {
			this.getView().byId("service-detail-map").setBusy(true);
			var latitude = this.getView().byId('latitude');
			var longitude = this.getView().byId('longitude');
			var pos = {};
			var that = this;
			if (this.geocoder === null || this.geocoder === "" || this.geocoder === undefined) {
				console.log("initialized")
				cleanupRequired = false;
				this.geocoder = new google.maps.Geocoder();
				window.mapOptions = {
					center: new google.maps.LatLng(27.00, 87.00),
					zoom: 17,
					mapTypeId: google.maps.MapTypeId.ROADMAP
				};
				$('#__component0---object--page-page-contentFitContainer').addClass('sapFDynamicPageContentFitContainer');
				objectMap = new google.maps.Map(this.getView().byId("service-detail-map").getDomRef(), window.mapOptions);

				window.map = objectMap;

				var infowindow = new google.maps.InfoWindow();
				if (objectMap !== "" && objectMap !== null) {
					watch = navigator.geolocation.watchPosition(function(position) {
						if (pos && pos.lat && (pos.lat === 'undefined' || pos.lat === '')) {
							pos = {
								lat: position.coords.latitude,
								lng: position.coords.longitude
							};
						}
						infowindow.setPosition(pos);
						objectMap.setCenter(pos);
						objectMap.panTo(pos);
					}, function() {
						MessageToast.show('Error: The Geolocation service failed.');
					}, {
						enableHighAccuracy: true,
						maximumAge: 10e3,
						timeout: 20e3
					});
					
					google.maps.event.addListenerOnce(objectMap, 'idle', function () {
						google.maps.event.trigger(objectMap, 'resize');
					});
				}
			}
			setTimeout(() => {
					latitude = parseFloat(latitude.mProperties.text);
					longitude = parseFloat(longitude.mProperties.text);
					pos = {
						lat: latitude,
						lng: longitude
					};
					if (pos.lat !== undefined && pos.lat !== null && pos.lat !== "") {
						var marker = new google.maps.Marker({
							map: objectMap,
							position: pos,
							icon: 'image/map-pin.png'
						});
						objectMap.setCenter(pos);
						objectMap.panTo(pos);
						that.getView().byId("service-detail-map").setBusy(false);
					} 
			}, 3000);
		},
		
		/**
		 * Handle the edit service request button event
		 * @author dipak
		 */
		editServiceRequest: function(oItem) {
			var taskModel = this.getView().getModel("task");
			taskModel.oData = {
				"ID": objectModel.ID,
				"DESCRIPTION": objectModel.TASK_DESCRIPTION,
				"STATUS_ID": objectModel.TASK_STATUS_ID,
				"SERVICE_TYPE_ID": objectModel.SERVICE_TYPE_ID,
				"CUSTOMER_ID": objectModel.CUSTOMER_ID,
				"SERVICE_CATEGORY_ID": objectModel.SERVICE_CATEGORY_ID,
				"TASK_REQUESTED_DATE": objectModel.TASK_REQUESTED_DATE,
				"COUNTRY": objectModel.COUNTRY,
				"STREET_NAME": objectModel.STREET_NAME,
				"STREET_NUM": objectModel.STREET_NUM,
				"STATE": objectModel.STATE,
				"REGION": objectModel.REGION,
				"APARTMENT": objectModel.APARTMENT,
				"ADDRESS": objectModel.ADDRESS,
				"LATITUDE": objectModel.LATITUDE,
				"LONGITUDE": objectModel.LONGITUDE,
				"LOCATION_ID": objectModel.LOCATION_ID
			};
			this.cleanUpView();
			this.getRouter().navTo("create", {
				"task":taskModel.oData
			});
		},
		/**
		 * All the cleanups needed, clears the navigator object, map instance as well as watch index
		 */
		cleanUpView: function() {
			this.geocoder = "";
			objectMap = null;
			this.clearWatch();
		},

		clearWatch: function() {
			if (watch !== null) {
				navigator.geolocation.clearWatch(watch);
				watch = null;
			}
		},
		
		returnToWorkList: function(){
			this.cleanUpView();
			this.getRouter().navTo("worklist");
		}

	});

});