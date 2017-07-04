sap.ui.define([
	] , function () {
		"use strict";

		return {

			/**
			 * Rounds the number unit value to 2 digits
			 * @public
			 * @param {string} sValue the number string to be rounded
			 * @returns {string} sValue with 2 digits rounded
			 */
			numberUnit : function (sValue) {
				if (!sValue) {
					return "";
				}
				return parseFloat(sValue).toFixed(2);
			},
			
			address : function(streetNumber, streetName, state, country){
				var address = "";
				if (streetNumber !== '' || streetNumber !== 'undefined') {
					address = streetNumber;
				}
				if (streetName !== '' || streetName !== 'undefined') {
					address += address === "" ? streetName : ", "+streetName;
				}
				if (state !== '' || state !== 'undefined') {
					address += address === "" ? state : ", "+state;
				}
				if (country !== '' || country !== 'undefined') {
					address += address === "" ? country : ", "+country;
				}
				return address;
			}

		};

	}
);