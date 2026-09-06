# Sokratus meniu užsakymuose

Naudotojo scenarijus, kuris Sokratus maisto užsakymo lentelėje parodo savaitės
valgiaraščio aprašymus.

## Diegimas

1. Įdiekite [„Tampermonkey“](https://www.tampermonkey.net/) savo naršyklėje.
2. Atidarykite [scenarijaus diegimo nuorodą](https://mdonatas.github.io/sokratus-menu/sokratus-menu.user.js) ir patvirtinkite diegimą.
3. Iš naujo įkelkite įprastą Sokratus `/order` puslapį.

Išsami, įrenginiui pritaikyta instrukcija pateikta
[diegimo puslapyje](https://mdonatas.github.io/sokratus-menu/).

## Veikimas ir privatumas

Scenarijus atlieka vieną tos pačios svetainės `GET` užklausą į `/menu`,
išlaikydamas dabartinio adreso autentifikavimo ID ir datą. Scenarijuje nėra
prisijungimo duomenų, o duomenys nesiunčiami už Sokratus svetainės ribų.

Jis perskaito visus meniu skirtukus, įskaitant paslėptus variantus, ir prideda
tekstinius aprašymus prie kompiuterio bei telefono užsakymo lentelių. Scenarijus
nekeičia žymimųjų langelių reikšmių, nesiunčia užsakymo įvykių ir nieko
nepatvirtina.

Papildomų pasirinkimų skiltį galima suskleisti. Pasirinkimas išsaugomas tik
toje naršyklėje ir sinchronizuojamas tarp kompiuterio bei telefono išdėstymų.

## Tikrinimas

Tikrosios svetainės puslapiai buvo tik apžiūrėti. Scenarijus tikrintas vietinėje
sintetinėje aplinkoje ir nebuvo diegiamas ar vykdomas tikrojoje užsakymų
svetainėje.

`node verify.cjs` paleidžia bandomąjį puslapį adresu
<http://127.0.0.1:8765/order?date=2026-09-07&id=fixture>. Į patikrą įtraukti abu
išdėstymai, visi 90 žymimųjų langelių, kiekių atitikmenys, pradinė valdiklių
būsena, pakartotinis scenarijaus vykdymas, saugus teksto įterpimas, lentelės
pločiai, horizontalus slinkimas, papildomų pasirinkimų būsena ir informacinio
pranešimo valdymas. Naujausia versija išlaikė 120 patikrų 390 px ir 1280 px
pločiuose.

## Licencija

[MIT](LICENSE)
