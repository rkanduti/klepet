function divElementEnostavniTekst(sporocilo) {
  var jeSmesko = sporocilo.indexOf('http://sandbox.lavbic.net/teaching/OIS/gradivo/') > -1;
  var jeSlika = sporocilo.indexOf('mojaSlika') > -1;
  var jeYouTube = sporocilo.indexOf('https://www.youtube.com/') > -1;
  if (jeSmesko || jeSlika || jeYouTube) {
    sporocilo = sporocilo.replace(/\</g, '&lt;').replace(/\>/g, '&gt;').replace(/\&lt\;img/g, '<img')
                         .replace(/png\' \/&gt;/g, 'png\' />').replace(/jpg\' \/&gt;/g, 'jpg\' />')
                         .replace(/gif\' \/&gt;/g, 'gif\' />').replace(/\</g, '&lt;')
                         .replace(/\>/g, '&gt;').replace(/\&lt\;iframe/g, '<iframe')
                         .replace(/allowfullscreen&gt;&lt;\/iframe&gt;/g, 'allowfullscreen></iframe>');
    return $('<div style="font-weight: bold"></div>').html(sporocilo);
  } else {
    return $('<div style="font-weight: bold;"></div>').text(sporocilo);
  }
}

function divElementHtmlTekst(sporocilo) {
  return $('<div></div>').html('<i>' + sporocilo + '</i>');
}

function procesirajVnosUporabnika(klepetApp, socket) {
  var sporocilo = $('#poslji-sporocilo').val();
  sporocilo = dodajSmeske(sporocilo);
  var sistemskoSporocilo;

  if (sporocilo.charAt(0) == '/') {
    sistemskoSporocilo = klepetApp.procesirajUkaz(sporocilo);
    if (sistemskoSporocilo) {
      $('#sporocila').append(divElementHtmlTekst(sistemskoSporocilo));
      sporocilo = dodajSlike(sistemskoSporocilo);
      dodajVideo(sistemskoSporocilo);
    }
  } else {
    sporocilo = filtirirajVulgarneBesede(sporocilo);
    klepetApp.posljiSporocilo(trenutniKanal, sporocilo);
    $('#sporocila').append(divElementEnostavniTekst(sporocilo));
    dodajSlike(sporocilo);
    dodajVideo(sporocilo);
    $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
  }

  $('#poslji-sporocilo').val('');
}

var socket = io.connect();
var trenutniVzdevek = "", trenutniKanal = "";

var vulgarneBesede = [];
$.get('/swearWords.txt', function(podatki) {
  vulgarneBesede = podatki.split('\r\n');
});

function filtirirajVulgarneBesede(vhod) {
  for (var i in vulgarneBesede) {
    vhod = vhod.replace(new RegExp('\\b' + vulgarneBesede[i] + '\\b', 'gi'), function() {
      var zamenjava = "";
      for (var j=0; j < vulgarneBesede[i].length; j++)
        zamenjava = zamenjava + "*";
      return zamenjava;
    });
  }
  return vhod;
}

$(document).ready(function() {
  var klepetApp = new Klepet(socket);
  $('#vsebina').jrumble();
  
  socket.on('vzdevekSpremembaOdgovor', function(rezultat) {
    var sporocilo;
    if (rezultat.uspesno) {
      trenutniVzdevek = rezultat.vzdevek;
      $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
      sporocilo = 'Prijavljen si kot ' + rezultat.vzdevek + '.';
    } else {
      sporocilo = rezultat.sporocilo;
    }
    $('#sporocila').append(divElementHtmlTekst(sporocilo));
  });

  socket.on('pridruzitevOdgovor', function(rezultat) {
    trenutniKanal = rezultat.kanal;
    $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
    $('#sporocila').append(divElementHtmlTekst('Sprememba kanala.'));
  });

  socket.on('sporocilo', function (sporocilo) {
    var novElement = divElementEnostavniTekst(sporocilo.besedilo);
    console.log(sporocilo);
    var temp = sporocilo.besedilo.substring(sporocilo.besedilo.indexOf(":"), sporocilo.besedilo.length);
    console.log(temp);
    $('#sporocila').append(novElement);
    dodajSlike(temp);
    dodajVideo(sporocilo.besedilo);
  });
  
  socket.on('kanali', function(kanali) {
    $('#seznam-kanalov').empty();

    for(var kanal in kanali) {
      kanal = kanal.substring(1, kanal.length);
      if (kanal != '') {
        $('#seznam-kanalov').append(divElementEnostavniTekst(kanal));
      }
    }

    $('#seznam-kanalov div').click(function() {
      klepetApp.procesirajUkaz('/pridruzitev ' + $(this).text());
      $('#poslji-sporocilo').focus();
    });
  });

  socket.on('uporabniki', function(uporabniki) {
    $('#seznam-uporabnikov').empty();
    for (var i=0; i < uporabniki.length; i++) {
      $('#seznam-uporabnikov').append(divElementEnostavniTekst(uporabniki[i]));
    }
    
    $('#seznam-uporabnikov div').click(function() {
      klepetApp.procesirajUkaz('/zasebno1 ' + $(this).text());
      $('#poslji-sporocilo').focus();
    });
  });
  
  socket.on('dregljaj', function(uporabniki) {
    $('#vsebina').trigger('startRumble');
    setTimeout(function(){ $('#vsebina').trigger('stopRumble'); }, 1500);
    
  });

  setInterval(function() {
    socket.emit('kanali');
    socket.emit('uporabniki', {kanal: trenutniKanal});
  }, 1000);

  $('#poslji-sporocilo').focus();

  $('#poslji-obrazec').submit(function() {
    procesirajVnosUporabnika(klepetApp, socket);
    return false;
  });
});

function dodajSmeske(vhodnoBesedilo) {
  var preslikovalnaTabela = {
    ";)": "wink.png",
    ":)": "smiley.png",
    "(y)": "like.png",
    ":*": "kiss.png",
    ":(": "sad.png"
  }
  for (var smesko in preslikovalnaTabela) {
    vhodnoBesedilo = vhodnoBesedilo.replace(smesko,
      "<img src='http://sandbox.lavbic.net/teaching/OIS/gradivo/" +
      preslikovalnaTabela[smesko] + "' />");
  }
  return vhodnoBesedilo;
}

function dodajSlike(vhodnoBesedilo) {
  var besede = vhodnoBesedilo.split(' ');
  var regex = new RegExp("^(http|https)://\.*(.png|.jpg|.gif)$", "gi");
  
  for (var i = 0; i < besede.length; i++) {
    var isMatch = regex.test(besede[i]);
    if (isMatch) {
      console.log(regex.test(besede[i]) + " " + besede[i]);
      var slika = zgradiSliko(besede[i]);
      $('#sporocila').append(slika);
    }
  }
}

function dodajVideo(vhodnoBesedilo) {
  var besede = vhodnoBesedilo.split(' ');
  var regex = new RegExp("^https://www.youtube.com/watch\\?v=", "gi");
  
  for (var i = 0; i < besede.length; i++) {
    if (regex.test(besede[i])) {
      var temp = besede[i].replace(regex, "$`");
      var video = zgradiVideo(temp);
      $('#sporocila').append(video);
    }
  }
}

function zgradiSliko(link) {
  var slika = document.createElement("img");
  
  slika.setAttribute("class", "mojaSlika");
  slika.setAttribute("src", link);
  
  return slika;
}

function zgradiVideo(link) {
  var video = document.createElement("iframe");
  
  video.setAttribute("class", "mojVideo");
  video.setAttribute("src", "https://www.youtube.com/embed/" + link);
  video.setAttribute("allowFullScreen", "");
  
  return video;
} 
