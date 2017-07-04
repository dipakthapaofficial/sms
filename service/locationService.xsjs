//**** Example for basic REQUEST RESPONSE handling
var paramName;
var paramValue;
var headerName;
var headerValue;
var contentType;
// Implementation of GET call
function handleGet() {
	var offset = $.request.parameters.get("offset");
	var limit = $.request.parameters.get("limit");
	try {
		var conn = $.db.getConnection();
		var pstm = conn
				.prepareStatement('SELECT ID, COUNTRY, STREET_NAME, STREET_NUM, STATE, REGION, APARTMENT, LATITUDE, LONGITUDE, POINT.ST_AsGeoJson() AS POINT from \"SERVICE_MANAGEMENT_SYSTEM\".\"sms.data::SR.Location\" LIMIT ? OFFSET ?');
		pstm.setString(1, limit);
		pstm.setString(2, offset);

		var resultSet = pstm.executeQuery();

		var locationList = {
			"locations" : []
		};
		while (resultSet.next()) {
			locationList.locations.push({
				ID : parseInt(resultSet.getString(1)),
				COUNTRY : resultSet.getString(2),
				STREET_NAME : resultSet.getString(3),
				STREET_NUM : resultSet.getString(4),
				STATE : resultSet.getString(5),
				REGION : resultSet.getString(6),
				APARTMENT : resultSet.getString(7),
				LATITUDE : parseFloat(resultSet.getString(8)),
				LONGITUDE : parseFloat(resultSet.getString(9)),
				POINT : JSON.parse(resultSet.getString(10))
			});
		}
		resultSet.close();
		conn.close();
		$.response.status = $.net.http.OK;
	} catch (err) {
		$.response.status = $.net.http.INTERNAL_SERVER_ERROR;
		$.response.setBody(err.message);
		$.trace.error(err.message);
	}

	$.trace.error("about to return response");
	return locationList;
}
// Implementation of POST call
function handlePost() {
	var bodyStr = $.request.body ? $.request.body.asString() : undefined;
	if (bodyStr === undefined) {
		$.response.status = $.net.http.INTERNAL_SERVER_ERROR;
		return {
			"myResult" : "Missing BODY"
		};
	}
	// Extract body insert data to DB and return results in JSON/other format
	var formData = JSON.parse(bodyStr);

	var latitude = formData.LATITUDE;
	if (latitude === null || latitude === '') {
		$.trace.debug("so latitude is null or empty");
		$.response.status = $.net.http.INTERNAL_SERVER_ERROR;
		return {
			"myResult" : "Missing latitude field"
		};
	} else {
		latitude = parseFloat(latitude);
	}
	var longitude = formData.LONGITUDE;
	if (longitude === null || longitude === '') {
		$.trace.debug("so longitude is null or empty");
		$.response.status = $.net.http.INTERNAL_SERVER_ERROR;
		return {
			"myResult" : "Missing longitude field"
		};
	} else {
		longitude = parseFloat(longitude);
	}

	var locationId = formData.LOCATION_ID;
	locationId = locationId != null && locationId != ''
			&& locationId != undefined && !isNaN(locationId) ? parseInt(locationId)
			: '';
	var country = formData.COUNTRY;
	var streetName = formData.STREET_NAME;
	var streetNum = formData.STREET_NUM;
	var state = formData.STATE;
	var region = formData.REGION;
	var apartment = formData.APARTMENT;
	var location;
	var result = {
		"locationId" : locationId,
		"country" : country,
		"streetName" : streetName,
		"streetNum" : streetNum,
		"state" : state,
		"region" : region,
		"apartment" : apartment,
		"longitude" : longitude,
		"latitude" : latitude
	};
	var resultSet = 1;
	try {
		var conn = $.db.getConnection();
		$.trace.error("about to save location");
		$.trace.error("locationID==");
		$.trace.error(locationId);
		if (locationId == null || locationId == '') {
			query = conn
					.prepareStatement('SELECT \"SERVICE_MANAGEMENT_SYSTEM\".\"sms.data::locationId\".NEXTVAL AS locationId from Dummy');
			resultSet = query.executeQuery();
			
			while (resultSet.next()) {
				locationId = resultSet.getInteger(1);
				result.locationId=locationId;
				$.trace.error(locationId);	
				$.trace.error("inside while next loop of location result");	
			}
			$.trace.error("outside while next loop");
			query = conn
					.prepareStatement('SELECT ID FROM \"SERVICE_MANAGEMENT_SYSTEM\".\"sms.data::SR.TaskStatus\" WHERE STATUS=\'Requested\'');
			resultSet = query.executeQuery();
			var statusId;
			while (resultSet.next()) {
				statusId = resultSet.getString(1);
				$.trace.error(statusId);	
				$.trace.error("inside while next loop");	
			}
			$.trace.error("outside while next loop");	
			
			var query = conn
					.prepareStatement('INSERT INTO \"SERVICE_MANAGEMENT_SYSTEM\".\"sms.data::SR.Location\" VALUES(?,?,?,?,?,?,?,?,?,new ST_POINT('
							+ latitude + ',' + longitude + '))');
			query.setInteger(1, locationId);
			query.setString(2, country);
			query.setString(3, streetName);
			query.setString(4, streetNum);
			query.setString(5, state);
			query.setString(6, region);
			query.setString(7, apartment);
			query.setFloat(8, latitude);
			query.setFloat(9, longitude);

			resultSet = query.executeUpdate();
			$.trace.error(resultSet.length > 0);
			$.trace.error("saved location");
			conn.commit();

			$.trace.error(resultSet.length > 0);
			$.trace.error(resultSet[0]);
			$.trace.error("got id through sequence" + locationId);
			conn.commit();
		}
	} catch (err) {
		$.response.status = $.net.http.INTERNAL_SERVER_ERROR;
		$.response.setBody(err.message);
		$.trace.error(err.message);
	} finally {
		resultSet.close();
		conn.close();
	}

	$.trace.debug(result);
	// Extract body insert data to DB and return results in JSON/other format
	$.response.status = $.net.http.CREATED;
	$.trace.error("about to return result");
	return {
		"result" : result
	};
}
// Check Content type headers and parameters
function validateInput() {
	var i;
	var j;
	// Check content-type is application/json
	contentType = $.request.contentType;
	if (contentType === null
			|| contentType.startsWith("application/json") === false) {
		$.response.status = $.net.http.INTERNAL_SERVER_ERROR;
		$.response.setBody("Wrong content type request use application/json");
		return false;
	}
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
				$.response.setBody(JSON.stringify(handleGet()));
				break;
			// Handle your POST calls here
			case $.net.http.POST:
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
