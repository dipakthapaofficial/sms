jQuery.sap.require("sap.ui.qunit.qunit-css");
jQuery.sap.require("sap.ui.thirdparty.qunit");
jQuery.sap.require("sap.ui.qunit.qunit-junit");
QUnit.config.autostart = false;

sap.ui.require([
		"sap/ui/test/Opa5",
		"sms/test/integration/pages/Common",
		"sap/ui/test/opaQunit",
		"sms/test/integration/pages/Worklist",
		"sms/test/integration/pages/Object",
		"sms/test/integration/pages/NotFound",
		"sms/test/integration/pages/Browser",
		"sms/test/integration/pages/App"
	], function (Opa5, Common) {
	"use strict";
	Opa5.extendConfig({
		arrangements: new Common(),
		viewNamespace: "sms.view."
	});

	sap.ui.require([
		"sms/test/integration/WorklistJourney",
		"sms/test/integration/ObjectJourney",
		"sms/test/integration/NavigationJourney",
		"sms/test/integration/NotFoundJourney"
	], function () {
		QUnit.start();
	});
});