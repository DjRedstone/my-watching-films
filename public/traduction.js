const flags = {
  "en": "https://flagsweb.com/Flag_Emoji/United_Kingdom_%28UK%29_Flag_Emoji.png",
  "fr": "https://flagsweb.com/Flag_Emoji/France_Flag_Emoji.png",
  //"ge": "https://flagsweb.com/Flag_Emoji/Germany_Flag_Emoji.png"
}

$(document).ready(() => {
	const userLang = navigator.language || navigator.userLanguage;
	let lang = userLang.split("-")[0];
	//let lang = "es";

  if (!Object.keys(flags).includes(lang))
    lang = "en";

  console.log(`Translating in ${lang}`);
  
	socket.emit("get-traductions", lang);

  let languagesListOpen = false;
  function closeOpenLanguagesList() {
    if (languagesListOpen) {
      $("#language-button").css("height", "100px");
    } else {
      $("#language-button").css("height", `${100 + (80 * Object.keys(flags).length)}px`);
    }
    languagesListOpen = !languagesListOpen;
  }
  $("#language-button-up").on("click", closeOpenLanguagesList);

  $("#language-button-up-img").attr("src", flags[lang]);
  for (const Llang of Object.keys(flags)) {
    $("#language-button").append(`<img id="language-flag-${Llang}" class="language-flag" src="${flags[Llang]}">`);
    $(`#language-flag-${Llang}`).on("click", () => {
      $("#language-button-up-img").attr("src", flags[Llang]);
      console.log(`Translating in ${Llang}`);
      socket.emit("get-traductions", Llang);
      closeOpenLanguagesList();
    });
  }
});

let TRANS;
socket.on("get-traductions", (data) => {
  TRANS = data;
  delete data.error;
	translate("", data);
});

function translate(before, data) {
	for (const key of Object.keys(data)) {
		const value = data[key];
		if (value.type == undefined) {
			const newBefore = before + key + ".";
			translate(newBefore, value);
		} else {
			const ele = $(`[trans="${before + key}"]`);
      ele.attr("translate", "no");
			switch(value.type) {
				default:
					ele.attr(value.type, value.text);
					break;
				case "text":
					ele.text(value.text);
					break;
			}
		}
	}
}
