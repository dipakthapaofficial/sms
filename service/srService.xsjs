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
	$.response.status = $.net.http.OK;
	return {
		"myResult" : "GET Request Success"
	};
}
// Implementation of POST call
function handlePost() {
	$.trace.error("inside handlePost method");
	var bodyStr = $.request.body ? $.request.body.asString() : undefined;
	$.trace.error(bodyStr);
	$.trace.error("-------------------------------------------------------------------------");
	if (bodyStr === undefined) {
		$.trace.debug("so bodystr is undefined");
		$.response.status = $.net.http.INTERNAL_SERVER_ERROR;
		return {
			"myResult" : "Missing BODY"
		};
	}
	var formData = JSON.parse(bodyStr);
	var description = formData.DESCRIPTION;
	$.trace.debug("Reached description" + description);
	if (description === null || description === '') {
		$.trace.error("so description is null or empty");
		$.response.status = $.net.http.INTERNAL_SERVER_ERROR;
		return {
			"myResult" : "Missing description field"
		};
	}
	var latitude = formData.LATITUDE;
	if (latitude === null || latitude === '') {
		$.trace.error("so latitude is null or empty");
		$.response.status = $.net.http.INTERNAL_SERVER_ERROR;
		return {
			"myResult" : "Missing latitude field"
		};
	} else {
		latitude = parseFloat(latitude);
	}
	var longitude = formData.LONGITUDE;
	if (longitude === null || longitude === '') {
		$.trace.error("so longitude is null or empty");
		$.response.status = $.net.http.INTERNAL_SERVER_ERROR;
		return {
			"myResult" : "Missing longitude field"
		};
	} else {
		longitude = parseFloat(longitude);
	}
	$.trace.error("so nothing failed so far");
	var taskId = formData.ID;
	var locationId = formData.LOCATION_ID;
	locationId = UTILS.checkNotEmptyAndNotNull(locationId) ? parseInt(locationId)
			: '';
	var statusId = formData.STATUS_ID;
	statusId = UTILS.checkNotEmptyAndNotNull(statusId) ? parseInt(statusId)
			: '';
	var serviceTypeId = formData.SERVICE_TYPE_ID;
	serviceTypeId = UTILS.checkNotEmptyAndNotNull(serviceTypeId) ? parseInt(serviceTypeId)
			: '';
	var customerId = formData.CUSTOMER_ID;
	customerId = UTILS.checkNotEmptyAndNotNull(customerId) ? parseInt(customerId)
			: 1;
	var serviceCategoryId = formData.SERVICE_CATEGORY_ID;
	serviceCategoryId = UTILS.checkNotEmptyAndNotNull(serviceCategoryId) ? parseInt(serviceCategoryId)
			: '';
	var taskRequestedDate = formData.TASK_REQUESTED_DATE;
	taskRequestedDate = UTILS.checkNotEmptyAndNotNull(taskRequestedDate) ? new Date(Date.parse(taskRequestedDate)) : new Date(Date.now());
	var country = formData.COUNTRY;
	var streetName = formData.STREET_NAME;
	var streetNum = formData.STREET_NUM;
	var state = formData.STATE;
	var region = formData.REGION;
	var apartment = formData.APARTMENT;
	var address = formData.ADDRESS;
	$.trace.error(address)
	var resultSet;
	var result = {
		"ID" : taskId,
		"DESCRIPTION" : description,
		"STATUS_ID" : statusId,
		"SERVICE_TYPE_ID" : serviceTypeId,
		"CUSTOMER_ID" : customerId,
		"SERVICE_CATEGORY_ID" : serviceCategoryId,
		"TASK_REQUESTED_DATE":taskRequestedDate,
		"LOCATION_ID" : locationId
	};
	try {
		$.trace.error("about to save location");
		$.trace.error(locationId);
		$.trace.error("---------------------------------------n");
		var conn = $.db.getConnection();
		// Insert Location
		if (locationId == null || locationId == '') {
			$.trace.error("save");
			query = conn
					.prepareStatement('SELECT \"SERVICE_MANAGEMENT_SYSTEM\".\"sms.data::locationId\".NEXTVAL AS locationId from Dummy');
			resultSet = query.executeQuery();
			$.trace.error("sequence query executed");
			while (resultSet.next()) {
				locationId = resultSet.getInteger(1);
				result.locationId = locationId;
				$.trace.error(locationId);
				$.trace.error("inside while next loop of location result");
			}
			$.trace.error("outside while next loop");
			var query = conn
					.prepareStatement('INSERT INTO \"SERVICE_MANAGEMENT_SYSTEM\".\"sms.data::SR.Location\" VALUES(?,?,?,?,?,?,?,?,?,?,new ST_POINT('
							+ latitude + ',' + longitude + '))');
			query.setInteger(1, locationId);
			query.setString(2, country);
			query.setString(3, streetName);
			query.setString(4, streetNum);
			query.setString(5, state);
			query.setString(6, region);
			query.setString(7, apartment);
			query.setString(8, address);
			query.setFloat(9, latitude);
			query.setFloat(10, longitude);
			
			resultSet = query.executeUpdate();
		} else {
			$.trace.error("update");
			query = conn
					.prepareStatement('UPDATE \"SERVICE_MANAGEMENT_SYSTEM\".\"sms.data::SR.Location\" SET COUNTRY=?, STREET_NAME =?, STREET_NUM=?, STATE=?,REGION=?,APARTMENT=?,ADDRESS=?,LATITUDE=?,LONGITUDE=?,POINT=new ST_POINT('
							+ latitude + ',' + longitude + ') WHERE ID= ?');
			query.setString(1, country);
			query.setString(2, streetName);
			query.setString(3, streetNum);
			query.setString(4, state);
			query.setString(5, region);
			query.setString(6, apartment);
			query.setString(7, address);
			query.setFloat(8, latitude);
			query.setFloat(9, longitude);
			query.setInteger(10, locationId);
			resultSet = query.executeUpdate();
		}

		$.trace.error("saved location i guess");

		if (statusId == '') {
			query = conn
					.prepareStatement('SELECT ID FROM \"SERVICE_MANAGEMENT_SYSTEM\".\"sms.data::SR.TaskStatus\" WHERE STATUS=\'Requested\'');
			resultSet = query.executeQuery();
			while (resultSet.next()) {
				statusId = resultSet.getInteger(1);
				result.STATUS_ID = statusId;
				$.trace.error(statusId);
				$.trace.error("inside while next loop of statusId result");
			}
		}
		if (serviceTypeId == '') {
			query = conn
					.prepareStatement('SELECT ID FROM \"SERVICE_MANAGEMENT_SYSTEM\".\"sms.data::SR.ServiceType\" WHERE TYPE=\'Home Service\'');
			resultSet = query.executeQuery();
			while (resultSet.next()) {
				serviceTypeId = resultSet.getInteger(1);
				result.SERVICE_TYPE_ID = serviceTypeId;
				$.trace.error(serviceTypeId);
				$.trace.error("inside while next loop of serviceTypeId result");
			}
		}
		if (serviceCategoryId == '') {
			query = conn
					.prepareStatement('SELECT ID FROM \"SERVICE_MANAGEMENT_SYSTEM\".\"sms.data::SR.ServiceCategory\" WHERE DESCRIPTION=\'Default\'');
			resultSet = query.executeQuery();
			while (resultSet.next()) {
				serviceCategoryId = resultSet.getInteger(1);
				result.SERVICE_CATEGORY_ID = serviceCategoryId;
				$.trace.error(serviceCategoryId);
				$.trace.error("inside while next loop of serviceCategoryId result");
			}
		}

		if (taskId == null || taskId == '') {
			// Insert task
			query = conn
					.prepareStatement('SELECT \"SERVICE_MANAGEMENT_SYSTEM\".\"sms.data::taskId\".NEXTVAL AS taskId from Dummy');
			resultSet = query.executeQuery();
			$.trace.error("sequence query executed");
			while (resultSet.next()) {
				taskId = resultSet.getInteger(1);
				result.ID = taskId;
				$.trace.error(taskId);
				$.trace.error("inside while next loop of task ID result");
			}
			query = conn
					.prepareStatement('INSERT INTO \"SERVICE_MANAGEMENT_SYSTEM\".\"sms.data::SR.Task\" VALUES(?,?,?,?,?,?,?,?,now(),now())');
			query.setInteger(1, taskId);
			query.setString(2, description);
			query.setInteger(3, statusId);
			query.setInteger(4, locationId);
			query.setInteger(5, serviceTypeId);
			query.setInteger(6, customerId);
			query.setInteger(7, serviceCategoryId);
			query.setDate(8, taskRequestedDate);
			var resultSet = query.executeUpdate();
		} else {
			$.trace.error("inside update task");
			// Insert task
			query = conn
					.prepareStatement('UPDATE \"SERVICE_MANAGEMENT_SYSTEM\".\"sms.data::SR.Task\" SET DESCRIPTION=?, STATUS_ID=?, LOCATION_ID=?, SERVICE_TYPE_ID=?, CUSTOMER_ID=?, SERVICE_CATEGORY_ID=?, TASK_REQUESTED_DATE=?, MODIFIED_DATE = now() WHERE ID=?');
			query.setString(1, description);
			query.setInteger(2, statusId);
			query.setInteger(3, locationId);
			query.setInteger(4, serviceTypeId);
			query.setInteger(5, customerId);
			query.setInteger(6, serviceCategoryId);
			query.setDate(7, taskRequestedDate);
			query.setInteger(8, taskId);
			var resultSet = query.executeUpdate();
			result.ID = taskId;
			$.trace.error("task update executed");
		}
		conn.commit();
	} catch (err) {
		$.response.status = $.net.http.INTERNAL_SERVER_ERROR;
		$.response.setBody(err.message);
		$.trace.error(error.message);
		return;
	} finally {
		conn.close();
	}
	result.Status = "POST success";
	// Extract body insert data to DB and return results in JSON/other format
	$.response.status = $.net.http.CREATED;
	$.trace.debug("about to exti handle post method");
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
			// Handle your GET calls here
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
			default:
				$.response.status = $.net.http.METHOD_NOT_ALLOWED;
				$.response.setBody("Wrong request method");
				break;
			}
			$.response.contentType = "application/json";
		} catch (e) {
			$.response.setBody("Failed to execute action: " + e.toString());
		}
	}
}

// Call request processing
processRequest();