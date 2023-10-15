var delay = (() => {
  var timer = 0;
  return function(callback, ms) {
	  clearTimeout (timer);
	  timer = setTimeout(callback, ms);
	};
})();

let createAccount = false;
$("#create-account-button").on("click", () => {
	if (createAccount) {
		$("#connect-button").val(TRANS["connection-tab"]["login-signup"].text);
		$("#create-account-button").css("background-color", "");
		$("#create-account-checkbox").find("path").css("fill", "rgba(255, 255, 255, 0)");
	} else {
		$("#connect-button").val(TRANS["connection-tab"]["login-signup"].text2);
		$("#create-account-button").css("background-color", "rgba(150, 150, 150, .5)");
		$("#create-account-checkbox").find("path").css("fill", "rgba(255, 255, 255, 1)");
	}
	createAccount = !createAccount;
});

let showPassword = false;
$("#connection-show-password").on("click", () => {
	if (showPassword) {
		$("#connect-form-password").prop("type", "password");
		$("#connection-show-password").css("background-color", "");
		$("#connection-show-password-checkbox").find("path").css("fill", "rgba(255, 255, 255, 0)");
	} else {
		$("#connect-form-password").prop("type", "text");
		$("#connection-show-password").css("background-color", "rgba(150, 150, 150, .5)");
		$("#connection-show-password-checkbox").find("path").css("fill", "rgba(255, 255, 255, 1)");
	}
	showPassword = !showPassword;
});

$("#connect-form").on("submit", (e) => {
	e.preventDefault();
	$("#connection-message").css("color", "white");
	$("#connection-message").text(TRANS["connection-tab"]["waiting"].text);
	$("#connect-form-user").prop("disabled", true);
	$("#connect-form-password").prop("disabled", true);
	$("#connect-button").prop("disabled", true);
	const userName = $("#connect-form-user").val();
	const password = $("#connect-form-password").val();
	if (createAccount) {
		socket.emit("sign-up", {user: userName, password: password});
	} else {
		socket.emit("login", {user: userName, password: password});
	}
});

socket.on("login", login);
socket.on("sign-up", login);
function login(data) {
	if (data.type == "error") {
		$("#connection-message").css("color", "red");
		$("#connection-message").text(data.message);
		$("#connect-form-user").prop("disabled", false);
		$("#connect-form-password").prop("disabled", false);
		$("#connect-form-password").val("");
		$("#connect-button").prop("disabled", false);
	} else if (data.type == "succes") {
		const token = data.token;
		const userID = data.userData.uuid;
		
		$("#connection-message").css("color", "green");
		$("#connection-message").text(TRANS["connection-tab"]["welcome"].text);
    $("#connection-page").css("left", "50%");
		$("#connection-page").css("width", "0vw");

		// ---------------- ADD PAGE --------------------

		// FILMS
		let add_films = [];
		let add_selectedFilm;
		const add_filmInputEle = $("#add-search-film-input");
		add_filmInputEle.on("input", () => {
			delay(() => {
			  if (add_filmInputEle.val() != "") {
					socket.emit("search-films", add_filmInputEle.val());
				}
			}, 350);
		});

		socket.on("search-films", (data) => {
			console.log(data);
			$("#add-search-films").empty();
			add_films = [];
			for (const film of data) {
				$("#add-search-films").append(`	<div class="add-searched-film" id="add-searched-film-${film.imdbID}">
													         				${film.Title} | ${film.Year}
		 											 			 				</div>`);
				add_films.push($(`#add-searched-film-${film.imdbID}`));
				$(`#add-searched-film-${film.imdbID}`).on("click", () => {
					add_films.forEach((e) => e.attr("selected", false));
					$(`#add-searched-film-${film.imdbID}`).attr("selected", true);
					add_selectedFilm = film.imdbID;
				});
			}
		});

		// CINES
		let add_cinemas = [];
		let add_selectedCinema;
		const add_cinemaInputEle = $("#add-search-cine-input")
		add_cinemaInputEle.on("input", () => {
			delay(() => {
			  if (add_cinemaInputEle.val() != "") {
					socket.emit("search-cinemas", add_cinemaInputEle.val());
				}
			}, 350);
		});
		
		socket.on("search-cinemas", (data) => {
			console.log(data);
			$("#add-search-cines").empty();
			add_cinemas = [];
			for (const cine of data) {
				$("#add-search-cines").append(`<div class="add-searched-cine" id="add-searched-cine-${cine.fields.ndeg_auto}">
													         	 ${cine.fields.nom} | ${cine.fields.commune}
		 											 			 	 </div>`);
				add_cinemas.push($(`#add-searched-cine-${cine.fields.ndeg_auto}`));
				$(`#add-searched-cine-${cine.fields.ndeg_auto}`).on("click", () => {
					add_cinemas.forEach((e) => e.attr("selected", false));
					$(`#add-searched-cine-${cine.fields.ndeg_auto}`).attr("selected", true);
					add_selectedCinema = cine.fields.ndeg_auto;
				});
			}
		});
		
		// ---------------- SETTINGS PAGE --------------------
		$("#settings-name").text(data.userData.name);
		$("#settings-username").text(data.userData.user);

		// EDIT NAME
		$("#settings-edit-name").on("submit", (e) => {
			e.preventDefault();
			const newName = $("#settings-edit-name-input").val();
			socket.emit("change-user-name", {token: token, userID: userID, newName: newName});
			data.userData.name = newName;
			$("#settings-edit-name-info-message").css("color", "white");
			$("#settings-edit-name-info-message").text("Veuillez patientez...");
		});
		socket.on("change-user-name", (res) => {
			if (res.type == "error") {
				$("#settings-edit-name-info-message").css("color", "red");
				$("#settings-edit-name-info-message").text(res.message);
			} else if (res.type == "succes") {
				$("#settings-name").text(data.userData.name);
				$("#settings-edit-name-info-message").css("color", "green");
				$("#settings-edit-name-info-message").text("Le nom a été changé !");
			}
		});

		// EDIT USERNAME
		$("#settings-edit-username").on("submit", (e) => {
			e.preventDefault();
			const newUserName = $("#settings-edit-username-input").val();
			socket.emit("change-user-username", {token: token, userID: userID, newUserName: newUserName});
			data.userData.user = newUserName;
			$("#settings-edit-username-info-message").css("color", "white");
			$("#settings-edit-username-info-message").text("Veuillez patientez...");
		});
		socket.on("change-user-username", (res) => {
			if (res.type == "error") {
				$("#settings-edit-username-info-message").css("color", "red");
				$("#settings-edit-username-info-message").text(res.message);
			} else if (res.type == "succes") {
				$("#settings-username").text(data.userData.user);
				$("#settings-edit-username-info-message").css("color", "green");
				$("#settings-edit-username-info-message").text("Le nom de compte a été changé !");
			}
		});

		// EDIT PASSWORD
		$("#settings-edit-password").on("submit", (e) => {
			e.preventDefault();
			const newPassword = $("#settings-edit-password-input").val();
			socket.emit("change-user-password", {token: token, userID: userID, newPassword: newPassword});
			data.userData.password = newPassword;
			$("#settings-edit-password-info-message").css("color", "white");
			$("#settings-edit-password-info-message").text("Veuillez patientez...");
		});
		socket.on("change-user-password", (res) => {
			if (res.type == "error") {
				$("#settings-edit-password-info-message").css("color", "red");
				$("#settings-edit-password-info-message").text(res.message);
			} else if (res.type == "succes") {
				$("#settings-password").text(data.userData.password);
				$("#settings-edit-password-info-message").css("color", "green");
				$("#settings-edit-password-info-message").text("Le mot de passe a été changé !");
			}
		});
	}
}

let selectedTab;
const navItems = ["add", "list", "friends", "settings"];
function resetNavItems() {
	for (const item of navItems) {
		$(`#nav-${item}-item`).css("background-color", "");
		$(`#${item}-tab`).css("opacity", 0);
		$(`#${item}-tab`).css("z-index", 1);
	}
}
for (const item of navItems) {
	$(`#nav-${item}-item`).on("click", () => {
		if (selectedTab != item) {
			selectedTab = item;
			resetNavItems();
			$(`#nav-${item}-item`).css("background-color", "#AF5648");
			$(`#${item}-tab`).css("z-index", 2);
			setTimeout(() => {
				$(`#${item}-tab`).css("opacity", 1);
			}, 250);
		}
	});
}

let showSettingsPasswordInput = false;
$("#settings-edit-password-visibility").on("click", () => {
	const inputElement = $("#settings-edit-password-input");
	if (showSettingsPasswordInput) {
		inputElement.prop("type", "password");
	} else {
		inputElement.prop("type", "text");
	}
	showSettingsPasswordInput = !showSettingsPasswordInput;
});
