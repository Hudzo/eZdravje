
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
function dodajMeritveVitalnihZnakov() {
	var sessionId = getSessionId();

	var ehrId = $("#dodajVitalnoEHR").val();
	var datumInUra = $("#dodajVitalnoDatumInUra").val();
	var telesnaVisina = $("#dodajVitalnoTelesnaVisina").val();
	var telesnaTeza = $("#dodajVitalnoTelesnaTeza").val();

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
		        $("#dodajMeritveVitalnihZnakovSporocilo").html(
              "<span class='obvestilo label label-success fade-in'>" +
              res.meta.href + ".</span>");
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
 var flag1=0;
 var flag2=0;
 var flag3=0;
 
function generirajPodatke(stPacienta) {
    
    var sessionId = getSessionId();
	var ime="";
	var priimek="";
	var tabTeza=[];
	var tabVisina=[];
	var tabCas=[];
	var rojstniDan;
	
    switch(stPacienta){
        
        case 1:
        	if(flag1==1){
        		return;
        	}
        	else{
        		flag1=1;
        	}
        	//normal, boring child who will pobably...
        	tabTeza=[60, 62, 63, 65, 70, 71, 72, 72.4, 72.5];
        	tabVisina =[160, 160, 161, 162, 170, 173, 177, 179, 180];
        	tabCas = ["2015-01-03T9:00","2015-02-03T9:00","2015-03-03T9:00","2015-04-03T9:00","2015-05-03T9:00","2015-06-03T9:00","2015-07-03T9:00","2015-08-03T9:00","2015-09-03T9:00"];
            ime = "Janezek";
            priimek = "Mali";
            rojstniDan="2000-01-03T9:00";
			
        break;
        
        case 2:
        	if(flag2==1){
        		return;
        	}
        	else{
        		flag2=1;
        	}
            //bajs
            tabVisina = [150, 151, 151, 151, 151, 151, 151, 151, 151];
            tabTeza=[110,112,109,105,113,125,109,108,105];
            tabCas=["2000-01-01T17:00","2001-01-01T17:00","2002-01-01T17:00","2003-01-01T17:00","2004-01-01T17:00","2005-01-01T17:00","2006-01-01T17:00","2007-01-01T17:00","2008-01-01T17:00"];
            ime = "Jože";
            priimek = "Gorišek";
            rojstniDan="1960-01-03T9:00";
			
        break;
        
        case 3:
        	if(flag3==1){
        		return;
        	}
        	else{
        		flag3=1;
        	}
        	//presuh model
        	tabVisina = [172, 172, 172, 173, 173, 173, 174, 174, 175];
        	tabTeza = [45,46,44,45.5,42,43,46,48,50];
        	tabCas = ["1990-02-14T9:00","1990-02-14T10:00","1990-02-14T11:00","1990-02-14T12:00","1990-02-14T13:00","1990-02-14T14:00","1990-02-14T15:00","1990-02-14T16:00","1990-02-14T17:00"];
            ime = "Valentina";
            priimek = "Ljuben";
            rojstniDan="1987-01-03T9:00";
            
        break;
        
        default:
            console.log("Napaka");
        break;
    }
    
    
    var x = document.getElementById("preberiEhrIdZaVitalneZnake");
    var y = document.getElementById("preberiObstojeciVitalniZnak");
    var z = document.getElementById("preberiObstojeciEHR");
    var q = document.getElementById("preberiPredlogoBolnika");
    var option = document.createElement("option");
    var option1 = document.createElement("option");
    var option2 = document.createElement("option");
    var option3 = document.createElement("option");
	option.text = ime+" "+priimek;
	option1.text = ime+" "+priimek;
	option2.text = ime+" "+priimek;
	option3.text = ime+" "+priimek;
	
          //naredi nov ehr, in ga zapolni z meritvami
    $.ajaxSetup({
		headers: {"Ehr-Session": sessionId}
	});
    $.ajax({
	    url: baseUrl + "/ehr",
	    type: 'POST',
	    success: function (data) {
	        var ehrId = data.ehrId;
	        option.value=ehrId;
	        option1.value=ehrId;
	        option2.value=ehrId;
	        $("#header").html("EHR: " + ehrId);
	
	        // build party data
	        var partyData = {
	            firstNames: ime,
	            lastNames: priimek,
	            dateOfBirth: rojstniDan,
	            partyAdditionalInfo: [
	                {
	                    key: "ehrId",
	                    value: ehrId
	                }
	            ]
	        };
	        $.ajax({
	            url: baseUrl + "/demographics/party",
	            //async: false,
	            type: 'POST',
	            contentType: 'application/json',
	            data: JSON.stringify(partyData),
	            success: function(party){
	            	//dodaj vse meritve:
	            	
		           	for(var i=0; i<9; i++){
		           		var queryParams={
							ehrId: ehrId,
							templateId: 'Vital Signs',
							format: 'FLAT',
							committer: 'Tracer'
						}
					
					    var compositionData = {
						    "ctx/time": tabCas[i],
						    "ctx/language": "en",
						    "ctx/territory": "SI",
						    "vital_signs/height_length/any_event/body_height_length": tabVisina[i],
						    "vital_signs/body_weight/any_event/body_weight": tabTeza[i]
						};
						//dodaj
						$.ajax({
							url: baseUrl + "/composition?" + $.param(queryParams),
							async: false,
							type: 'POST',
							contentType: 'application/json',
							data: JSON.stringify(compositionData),
							success: function(){
								console.log("dodal:"+tabTeza[i])
							}
						});
		           	}
		        	
		            x.add(option);
		            y.add(option1);
		            z.add(option2);
		            q.add(option3);
	            }
	        });
	    }
	});
}







// TODO: Tukaj implementirate funkcionalnost, ki jo podpira vaša aplikacija


    /*dobi podatke iz spletne strani who.com
    BMI stanje, kaj pomeni, da si predebel...
    */ 
      
function podatkiOdZunaj(){
    	var url = "http://apps.who.int/bmi/index.jsp?introPage=intro_3.html";
    	 var sessionId = getSessionId();
    	
    	$.ajaxSetup({
			headers: {"Ehr-Session": sessionId}
		});
		
    	$.ajax({
    		url: url,
    		type: 'GET',
    		dataType: "",
    		success: function(res){
    			console.log(res);
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
	        for (var i in res) {
	            console.log(i);
	            console.log(res[i].time + ': ' + res[i].weight + res[i].unit);
	        }
	    }
	});
}