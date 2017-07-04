$.import("sms.service", "utils");

var UTILS = $.sms.service.utils;
var paramName;
var paramValue;
var headerName;
var headerValue;
var contentType;

// Implementation of GET call
function handleGet() {
	// Retrieve data here and return results in JSON/other format
	$.trace.error("Inside get method")
	var limit = $.request.parameters.get("limit");
	$.trace.error("limit="+limit)
	limit = UTILS.checkNotEmptyAndNotNull(limit) ? parseInt(limit) : 10;
	var offset = $.request.parameters.get("offset");
	offset = UTILS.checkNotEmptyAndNotNull(offset) ? parseInt(offset) : 0;
	$.trace.error("limit=" + limit + "  offset=" + offset);
	var query;
	var resultSet;
	var result = {
		"tasks" : []
	};

	try {
		var conn = $.db.getConnection();
		// Query to get tasks
		$.trace.error("about to execute task query");
		query = conn
				.prepareStatement('select ID, TASK_STATUS, TASK_DESCRIPTION, LOCATION_ID, LATITUDE, LONGITUDE, COUNTRY, STREET_NAME, STREET_NUM, REGION, APARTMENT, STATE from "_SYS_BIC"."sms.model/TASK_DETAILS" group by ID, TASK_STATUS, TASK_DESCRIPTION, LOCATION_ID, LATITUDE, LONGITUDE, COUNTRY, STREET_NAME, STREET_NUM, REGION, APARTMENT, STATE order by ID LIMIT ? OFFSET ?');
		query.setInteger(1, limit);
		query.setInteger(2, offset);

		resultSet = query.executeQuery();
		$.trace.error("task query executed");
		while (resultSet.next()) {
			var task = {};
			task.ID = resultSet.getInteger(1);
			task.TASK_STATUS = resultSet.getString(2);
			task.TASK_DESCRIPTION = resultSet.getString(3);
			task.LOCATION_ID = resultSet.getInteger(4);
			task.LATITUDE = resultSet.getFloat(5);
			task.LONGITUDE = resultSet.getFloat(6);
			task.COUNTRY = resultSet.getString(7);
			task.STREET_NAME = resultSet.getString(8);
			task.STREET_NUM = resultSet.getString(9);
			task.REGION = resultSet.getString(10);
			task.APARTMENT = resultSet.getString(11);
			task.STATE = resultSet.getString(12);
			result.tasks.push(task);
		}
		conn.close();
		$.response.status = $.net.http.OK;
	} catch (e) {
		$.response.status = $.net.http.INTERNAL_SERVER_ERROR;
		$.response.setBody(e.message);
		result = {
			"status" : "Unable to get the data",
		};
	}
	return result;
}

// Implementation of POST call
function handlePost() {
	// Retrieve data here and return results in JSON/other format
	var requestBody = $.request.body.asString();
	var polygon = JSON.parse(requestBody);
	var i = 0;
	// create polygon search string
	var polygonString = 'NEW ST_Point(LATITUDE, LONGITUDE).ST_Within( NEW ST_Polygon(\'Polygon((';
	for (i; i < polygon.length; i++) {
		polygonString += polygon[i].latitude + ' ' + polygon[i].longitude;
		if (i !== polygon.length - 1) {
			polygonString += ',';
		}
	}
	polygonString += "))'))";

	$.trace.error(polygonString);
	var cond;
	var query;
	var resultSet;
	var result = {
		"tasks" : []
	};
	try {
		var conn = $.db.getConnection();
		// Query to get tasks
		$.trace.error("about to execute task query");
		query = conn
				.prepareStatement('select ID, TASK_STATUS, TASK_DESCRIPTION, LOCATION_ID, LATITUDE, LONGITUDE, COUNTRY, STREET_NAME, STREET_NUM, REGION, APARTMENT, STATE, '
						+ polygonString
						+ ' AS COND from "_SYS_BIC"."sms.model/TASK_DETAILS" group by ID, TASK_STATUS, TASK_DESCRIPTION, LOCATION_ID, LATITUDE, LONGITUDE, COUNTRY, STREET_NAME, STREET_NUM, REGION, APARTMENT, STATE,'
						+ polygonString + ' order by ID');
		$.trace.error(query)
		resultSet = query.executeQuery();
		$.trace.error("task query executed");
		while (resultSet.next()) {
			cond = resultSet.getInteger(13);
			$.trace.error(cond)
			if (cond === 1) {
				var task = {};
				task.ID = resultSet.getInteger(1);
				task.TASK_STATUS = resultSet.getString(2);
				task.TASK_DESCRIPTION = resultSet.getString(3);
				task.LOCATION_ID = resultSet.getInteger(4);
				task.LATITUDE = resultSet.getFloat(5);
				task.LONGITUDE = resultSet.getFloat(6);
				task.COUNTRY = resultSet.getString(7);
				task.STREET_NAME = resultSet.getString(8);
				task.STREET_NUM = resultSet.getString(9);
				task.REGION = resultSet.getString(10);
				task.APARTMENT = resultSet.getString(11);
				task.STATE = resultSet.getString(12);
				$.trace.error(task.ID);
				result.tasks.push(task);
			}
		}
		result.count = result.tasks.length;
		conn.close();
		$.response.status = $.net.http.OK;
	} catch (e) {
		$.response.status = $.net.http.INTERNAL_SERVER_ERROR;
		$.response.setBody(e.message);
		result = {
			"status" : "Unable to get the data",
		};
	}

	return result;
}

// Check Content type headers and parameters
function validateInput() {
	var i;
	var j;
	// Check content-type is application/json
	contentType = $.request.contentType;
	// if (contentType === null
	// || contentType.startsWith("application/json") === false) {
	// $.response.status = $.net.http.INTERNAL_SERVER_ERROR;
	// $.response.setBody("Wrong content type request use application/json");
	// return false;
	// }
	// Extract parameters and process them
	for (i = 0; i < $.request.parameters.length; ++i) {
		paramName = $.request.parameters[i].name;
		paramValue = $.request.parameters[i].value;
		// Add logic
	}
	// Extract headers and process them
	for (j = 0; j < $.request.headers.length; ++j) {
		headerName = $.request.headers[j].name;
		headerValue = $.request.headers[j].value;
		// Add logic
	}
	return true;
}
// Request process
function processRequest() {
	if (validateInput()) {
		try {
			switch ($.request.method) {
			case $.net.http.GET:
				$.trace.debug("hello world");
				$.trace.error("Reached here");
				$.response.setBody(JSON.stringify(handleGet()));
				break;
			// Handle your POST calls here
			case $.net.http.POST:
				$.trace.debug("inside post method");
				$.response.setBody(JSON.stringify(handlePost()));
				break;
			// Handle your other methods: PUT, DELETE
			}
			$.response.contentType = "application/json";
		} catch (e) {
			$.response.setBody("Failed to execute action: " + e.toString());
		}
	}
}
// Call request processing
processRequest();
