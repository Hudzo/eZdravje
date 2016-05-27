
var baseUrl = 'https://rest.ehrscape.com/rest/v1';
var queryUrl = baseUrl + '/query';

var username = "ois.seminar";
var password = "ois4fri";


/**
 * Prijava v sistem z privzetim uporabnikom za predmet OIS in pridobitev
 * enolične ID številke za dostop do funkcionalnosti
 * @return enolični identifikator seje za dostop do funkcionalnosti
 */
function getSessionId() {
    var response = $.ajax({
        type: "POST",
        url: baseUrl + "/session?username=" + encodeURIComponent(username) +
                "&password=" + encodeURIComponent(password),
        async: false
    });
    return response.responseJSON.sessionId;
}


/**
 * Kreiraj nov EHR zapis za pacienta in dodaj osnovne demografske podatke.
 * V primeru uspešne akcije izpiši sporočilo s pridobljenim EHR ID, sicer
 * izpiši napako.
 */
function kreirajEHRzaBolnika() {
	var sessionId = getSessionId();

	var ime = $("#kreirajIme").val();
	var priimek = $("#kreirajPriimek").val();
	var datumRojstva = $("#kreirajDatumRojstva").val();

	if (!ime || !priimek || !datumRojstva || ime.trim().length == 0 ||
      priimek.trim().length == 0 || datumRojstva.trim().length == 0) {
		$("#kreirajSporocilo").html("<span class='obvestilo label " +
      "label-warning fade-in'>Prosim vnesite zahtevane podatke!</span>");
	} else {
		$.ajaxSetup({
		    headers: {"Ehr-Session": sessionId}
		});
		$.ajax({
		    url: baseUrl + "/ehr",
		    type: 'POST',
		    success: function (data) {
		        var ehrId = data.ehrId;
		        var partyData = {
		            firstNames: ime,
		            lastNames: priimek,
		            dateOfBirth: datumRojstva,
		            partyAdditionalInfo: [{key: "ehrId", value: ehrId}]
		        };
		        $.ajax({
		            url: baseUrl + "/demographics/party",
		            type: 'POST',
		            contentType: 'application/json',
		            data: JSON.stringify(partyData),
		            success: function (party) {
		                if (party.action == 'CREATE') {
		                    $("#kreirajSporocilo").html("<span class='obvestilo " +
                          "label label-success fade-in'>Uspešno kreiran EHR '" +
                          ehrId + "'.</span>");
		                    $("#preberiEHRid").val(ehrId);
		                }
		            },
		            error: function(err) {
		            	$("#kreirajSporocilo").html("<span class='obvestilo label " +
                    "label-danger fade-in'>Napaka '" +
                    JSON.parse(err.responseText).userMessage + "'!");
		            }
		        });
		    }
		});
	}
}


function preberiEHRodBolnika() {
	var sessionId = getSessionId();

	var ehrId = $("#preberiEHRid").val();

	if (!ehrId || ehrId.trim().length == 0) {
		$("#preberiSporocilo").html("<span class='obvestilo label label-warning " +
      "fade-in'>Prosim vnesite zahtevan podatek!");
	} else {
		$.ajax({
			url: baseUrl + "/demographics/ehr/" + ehrId + "/party",
			type: 'GET',
			headers: {"Ehr-Session": sessionId},
	    	success: function (data) {
				var party = data.party;
				$("#preberiSporocilo").html("<span class='obvestilo label " +
          "label-success fade-in'>Bolnik '" + party.firstNames + " " +
          party.lastNames + "', ki se je rodil '" + party.dateOfBirth +
          "'.</span>");
			},
			error: function(err) {
				$("#preberiSporocilo").html("<span class='obvestilo label " +
          "label-danger fade-in'>Napaka '" +
          JSON.parse(err.responseText).userMessage + "'!");
			}
		});
	}
}



/**
 * Za dodajanje vitalnih znakov pacienta je pripravljena kompozicija, ki
 * vključuje množico meritev vitalnih znakov (EHR ID, datum in ura,
 * telesna višina, telesna teža, sistolični in diastolični krvni tlak,
 * nasičenost krvi s kisikom in merilec).
 */
function vpisiMeritve(sth){
	var ehrId = $("#dodajVitalnoEHR").val();
	var datumInUra = $("#dodajVitalnoDatumInUra").val();
	var telesnaVisina = $("#dodajVitalnoTelesnaVisina").val();
	var telesnaTeza = $("#dodajVitalnoTelesnaTeza").val();
	dodajMeritveVitalnihZnakov(ehrId,datumInUra,telesnaVisina,telesnaTeza,sth);
}
 
 
function dodajMeritveVitalnihZnakov(ehrId,datumInUra,telesnaVisina,telesnaTeza,sth) {
	var sessionId = getSessionId();

	if (!ehrId || ehrId.trim().length == 0) {
		$("#dodajMeritveVitalnihZnakovSporocilo").html("<span class='obvestilo " +
      "label label-warning fade-in'>Prosim vnesite zahtevane podatke!</span>");
	} else {
		$.ajaxSetup({
		    headers: {"Ehr-Session": sessionId}
		});
		var podatki = {
			// Struktura predloge je na voljo na naslednjem spletnem naslovu:
      // https://rest.ehrscape.com/rest/v1/template/Vital%20Signs/example
		    "ctx/language": "en",
		    "ctx/territory": "SI",
		    "ctx/time": datumInUra,
		    "vital_signs/height_length/any_event/body_height_length": telesnaVisina,
		    "vital_signs/body_weight/any_event/body_weight": telesnaTeza
		};
		var parametriZahteve = {
		    ehrId: ehrId,
		    templateId: 'Vital Signs',
		    format: 'FLAT',
		    commiter: 'Sun bro'
		};
		$.ajax({
		    url: baseUrl + "/composition?" + $.param(parametriZahteve),
		    type: 'POST',
		    contentType: 'application/json',
		    data: JSON.stringify(podatki),
		    success: function (res) {
			    if(sth==1){    
			        $("#dodajMeritveVitalnihZnakovSporocilo").html(
	              "<span class='obvestilo label label-success fade-in'>" +
	              res.meta.href + ".</span>");
			    }
		    },
		    error: function(err) {
		    	$("#dodajMeritveVitalnihZnakovSporocilo").html(
            "<span class='obvestilo label label-danger fade-in'>Napaka '" +
            JSON.parse(err.responseText).userMessage + "'!");
		    }
		});
	}
}


/**
 * Generator podatkov za novega pacienta, ki bo uporabljal aplikacijo. Pri
 * generiranju podatkov je potrebno najprej kreirati novega pacienta z
 * določenimi osebnimi podatki (ime, priimek in datum rojstva) ter za njega
 * shraniti nekaj podatkov o vitalnih znakih.
 * @param stPacienta zaporedna številka pacienta (1, 2 ali 3)
 * @return ehrId generiranega pacienta
 */
 
function generateStuff(){
	alert("Generiram podatke, prosim pocakajte nekaj sekund...");
	generirajPodatke(1);
	generirajPodatke(2);
	generirajPodatke(3);
}
 
 var flag1=0;
 var flag2=0;
 var flag3=0;
 
function generirajPodatke(stPacienta) {
    
    var sessionId = getSessionId();
	var ime="";
	var priimek="";
	var rojstniDan;
	var ehrId;
	
	var x = document.getElementById("preberiEhrIdZaVitalneZnake");
    var y = document.getElementById("preberiObstojeciVitalniZnak");
    var z = document.getElementById("preberiObstojeciEHR");
    var q = document.getElementById("preberiPredlogoBolnika");
    var option = document.createElement("option");
    var option1 = document.createElement("option");
    var option2 = document.createElement("option");
    var option3 = document.createElement("option");
	

    switch(stPacienta){
        
        case 1:
        	if(flag1==1){
        		return;
        	}
        	else{
        		flag1=1;
        	}
        	//normal, boring child who will pobably be boring all his life, I guess
            ime = "Janezek";
            priimek = "Mali";
            rojstniDan="1980-01-03T9:00";
        	ehrId = createEHR(ime,priimek,rojstniDan);
        	
        	dodajMeritveVitalnihZnakov(ehrId,"1990-02-14T9:00",160,60,0);
        	dodajMeritveVitalnihZnakov(ehrId,"1990-03-14T9:00",160,62,0);
        	dodajMeritveVitalnihZnakov(ehrId,"1990-04-14T9:00",161,63,0);
        	dodajMeritveVitalnihZnakov(ehrId,"1990-05-14T9:00",162,65,0);
        	dodajMeritveVitalnihZnakov(ehrId,"1990-06-14T9:00",170,70,0);
        	dodajMeritveVitalnihZnakov(ehrId,"1990-07-14T9:00",173,71,0);
        	dodajMeritveVitalnihZnakov(ehrId,"1990-08-14T9:00",177,72,0);
        	dodajMeritveVitalnihZnakov(ehrId,"1990-09-14T9:00",179,72.4,0);
        	dodajMeritveVitalnihZnakov(ehrId,"1990-10-14T9:00",180,72.5,0);
			
        break;
        
        case 2:
        	if(flag2==1){
        		return;
        	}
        	else{
        		flag2=1;
        	}
            //bajs
            ime = "Jože";
            priimek = "Gorišek";
            rojstniDan="1960-01-03T9:00";
			ehrId = createEHR(ime,priimek,rojstniDan);
			
			dodajMeritveVitalnihZnakov(ehrId,"2000-02-14T9:00",150,110,0);
			dodajMeritveVitalnihZnakov(ehrId,"2001-02-14T9:00",151,112,0);
			dodajMeritveVitalnihZnakov(ehrId,"2002-02-14T9:00",151,109,0);
			dodajMeritveVitalnihZnakov(ehrId,"2003-02-14T9:00",151,105,0);
			dodajMeritveVitalnihZnakov(ehrId,"2004-02-14T9:00",151,113,0);
			dodajMeritveVitalnihZnakov(ehrId,"2005-02-14T9:00",151,125,0);
			dodajMeritveVitalnihZnakov(ehrId,"2007-02-14T9:00",151,109,0);
			dodajMeritveVitalnihZnakov(ehrId,"2008-02-14T9:00",151,108,0);
			dodajMeritveVitalnihZnakov(ehrId,"2009-02-14T9:00",151,105,0);
			
        break;
        
        case 3:
        	if(flag3==1){
        		return;
        	}
        	else{
        		flag3=1;
        	}
        	//presuh model
            ime = "Valentina";
            priimek = "Ljuben";
            rojstniDan="1987-01-03T9:00";
            ehrId = createEHR(ime,priimek,rojstniDan);
            
            dodajMeritveVitalnihZnakov(ehrId,"1990-02-14T9:00",172,45,0);
            dodajMeritveVitalnihZnakov(ehrId,"1990-02-14T10:00",172,46,0);
            dodajMeritveVitalnihZnakov(ehrId,"1990-02-14T11:00",172,44,0);
            dodajMeritveVitalnihZnakov(ehrId,"1990-02-14T12:00",173,45.5,0);
            dodajMeritveVitalnihZnakov(ehrId,"1990-02-14T13:00",173,42,0);
            dodajMeritveVitalnihZnakov(ehrId,"1990-02-14T14:00",173,43,0);
            dodajMeritveVitalnihZnakov(ehrId,"1990-02-14T15:00",174,46,0);
            dodajMeritveVitalnihZnakov(ehrId,"1990-02-14T16:00",174,48,0);
            dodajMeritveVitalnihZnakov(ehrId,"1990-02-14T17:00",174,50,0);
            
        break;
        
        default:
            console.log("Napaka");
        break;
    }
    
    option.value=ehrId;
	option1.value=ehrId;
	option2.value=ehrId;
    option.text = ime+" "+priimek;
	option1.text = ime+" "+priimek;
	option2.text = ime+" "+priimek;
	option3.text = ime+" "+priimek;
    
	x.add(option);
	y.add(option1);
	z.add(option2);
	q.add(option3);
}


function createEHR(ime, priimek, datumRojstva) {
    var sessionId = getSessionId();
    $.ajaxSetup({
        headers: {"Ehr-Session" :   sessionId}
    });
    var response = $.ajax({
        url     :   baseUrl + '/ehr',
        async   :   false,
        type    :   'POST',
        success :   function(data) {
                        var ehrId = data.ehrId;
                        var partyData = {
                            firstNames: ime,
                            lastNames: priimek,
                            dateOfBirth: datumRojstva,
                            partyAdditionalInfo: [{key: "ehrId", value: ehrId}]
                        };
                        $.ajax({
                            url: baseUrl + "/demographics/party",
                            type: 'POST',
                            contentType: 'application/json',
                            data: JSON.stringify(partyData),
                            success: function (party) {
                                if (party.action == 'CREATE') {
                                    console.log("Uspeh. [%s]", ehrId);
                                }
                            },
                            error: function(err) {
                                console.log("Napaka");
                            }
                        });
                    }
    });
    return response.responseJSON.ehrId;
}



// TODO: Tukaj implementirate funkcionalnost, ki jo podpira vaša aplikacija


    /*dobi podatke iz spletne strani who.com
    BMI stanje, kaj pomeni, da si predebel...
    */ 
      
function podatkiOdZunaj(){
    	
    	//not working
    	
    	var url = "apps.who.int/bmi/index.jsp?introPage=intro_3.html";
    	 var sessionId = getSessionId();
    	
    	$.ajaxSetup({
			headers: {"Ehr-Session": sessionId}
		});
		
    	$.ajax({
			url:'http://www.corsproxy.com/' + 'en.wikipedia.org/wiki/Briarcliff_Manor,_New_York',
	        type:'GET',
	        success: function(data){
	           console.log("success");
	        }
		});
}

//zapisi vrednosti iz dropdown menuja v text fielde

$(document).ready(function() {
	
	$('#preberiEhrIdZaVitalneZnake').change(function() {
		$('#meritveVitalnihZnakovEHRid').val($(this).val());
	});
	
	$('#preberiObstojeciVitalniZnak').change(function() {
		$('#dodajVitalnoEHR').val($(this).val());
	});
	
	$('#preberiObstojeciEHR').change(function() {
		$('#preberiEHRid').val($(this).val());
	});
	
	$('#preberiPredlogoBolnika').change(function() {
		var tekst=$(this).val().split(" ");
		$('#kreirajIme').val(tekst[0]);
		$('#kreirajPriimek').val(tekst[1]);
	});
	
	//podatkiOdZunaj();
	
	
});


//klik za izpis vseh vnosov dolocene osebe
function preberiMeritveVitalnihZnakov(){
	var sessionId = getSessionId();
	var ehrId = $('#meritveVitalnihZnakovEHRid').val();
	$.ajaxSetup({
	 	headers: {"Ehr-Session": sessionId}
	});
	
	
	$.ajax({
	    url: baseUrl + "/demographics/ehr/" + ehrId + "/party",
	    type: 'GET',
	    success: function (data) {
	        var party = data.party;
	        console.log(party.firstNames + ' ' +party.lastNames);
	    }
	});
	$.ajax({
	    url: baseUrl + "/view/" + ehrId + "/weight",
	    type: 'GET',
	    success: function (res) {
	        var podatki = [];
	        for (var i in res) {
	        	var cajt=res[i].time.split(".");
	            podatki.push([cajt[0], res[i].weight]);
	            console.log(podatki[i]);
	        }
	        izrisiGraf(podatki);
	        
	    }
	});
}

function izrisiGraf(arrData){
	/*
	*1:pridobi podatke
	*2:dodaj podatke v graf
	*3:pripni graf v rezultatMeritveVitalnihZnakov
	*optional - naredi se graf za visino/tezo
	*/
	var margin = {top: 20, right: 20, bottom: 30, left: 50},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

	var parseDate = d3.time.format("%Y-%m-%dT%X");
	
	
	var x = d3.time.scale()
	    .range([0, width]);
	
	var y = d3.scale.linear()
	    .range([height, 0]);
	
	var xAxis = d3.svg.axis()
	    .scale(x)
	    .orient("bottom");
	
	var yAxis = d3.svg.axis()
	    .scale(y)
	    .orient("left");
	
	var line = d3.svg.line()
	    .x(function(d) { return x(d.date); })
	    .y(function(d) { return y(d.close); });
	
	var svg = d3.select("#rezultatMeritveVitalnihZnakov").append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	  .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
	
	  var data = arrData.map(function(d) {
	      return {
	         date: parseDate.parse(d[0]),
	         close: d[1]
	      };
	      
	  });
	
	  console.log(data);
	
	
	  x.domain(d3.extent(data, function(d) { return d.date; }));
	  y.domain(d3.extent(data, function(d) { return d.close; }));
	
	  svg.append("g")
	      .attr("class", "x axis")
	      .attr("transform", "translate(0," + height + ")")
	      .call(xAxis);
	
	  svg.append("g")
	      .attr("class", "y axis")
	      .call(yAxis)
	    .append("text")
	      .attr("transform", "rotate(-90)")
	      .attr("y", 6)
	      .attr("dy", ".71em")
	      .style("text-anchor", "end")
	      .text("Price ($)");
	
	  svg.append("path")
	      .datum(data)
	      .attr("class", "line")
	      .attr("d", line);

}