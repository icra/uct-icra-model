/*
  Escenari exemple: 7 trams i una EDAR al tram 5

             EDAR
    t1--+     |
        |--> t5--+
    t2--+        |
                  +--> t7
    t3--+        |
        |--> t6--+
    t4--+
*/

/*Imports (node)*/
let Xarxa = require('./xarxa.js');                     //class Xarxa
let Tram = require('./tram.js');                       //class Tram
let State_Variables = require('./state-variables.js'); //class State_Variables
require('./primary-settler.js');                       //State_Variables.prototype.primary_settler  (function)
require('./activated-sludge.js');                      //State_Variables.prototype.activated_sludge (function)
require('./nitrification.js');                         //State_Variables.prototype.nitrification    (function)

//Nova xarxa buida
let xarxa = new Xarxa();

//Nous trams        ; Connecta'ls      ; Afegeix-los a la xarxa
let t1 = new Tram() ; /*arrel*/        ; xarxa.trams.push(t1);
let t2 = new Tram() ; /*arrel*/        ; xarxa.trams.push(t2);
let t3 = new Tram() ; /*arrel*/        ; xarxa.trams.push(t3);
let t4 = new Tram() ; /*arrel*/        ; xarxa.trams.push(t4);
let t5 = new Tram() ; t5.pares=[t1,t2] ; xarxa.trams.push(t5);
let t6 = new Tram() ; t6.pares=[t3,t4] ; xarxa.trams.push(t6);
let t7 = new Tram() ; t7.pares=[t5,t6] ; xarxa.trams.push(t7);

//Variables estat inicials | sintaxi: new(Q,S_VFA,S_FBSO,X_BPO,X_UPO,S_USO,X_iSS,S_FSA,S_OP,S_NOx)
t1.state_variables = new State_Variables(100, 1, 0, 0, 0, 0, 0, 0, 0, 0);
t2.state_variables = new State_Variables(100, 1, 0, 0, 0, 0, 0, 0, 0, 0);
t3.state_variables = new State_Variables(100, 0, 0, 0, 0, 0, 0, 0, 0, 0);
t4.state_variables = new State_Variables(100, 0, 0, 0, 0, 0, 0, 0, 0, 0);
t5.state_variables = new State_Variables(  0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
t6.state_variables = new State_Variables(  0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
t7.state_variables = new State_Variables(  0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

//Afegeix EDAR al tram 5 (variables estat influent)
t5.wwtp = new State_Variables(25, 50, 115, 440, 100, 45, 60, 39.1, 7.28, 0);

//configuració: t5.wwtp ---> PST ---> AS ---> effluent
let raw_ww = t5.wwtp; //stream
let pst    = raw_ww.primary_settler(fw=0.005, removal_BPO=42.335, removal_UPO=90.05, removal_iSS=75.125); //process
let as     = pst.effluent.activated_sludge(T=16, Vp=8473, Rs=15); //process

//Mostra resultats processos
console.log("=== RAW WW ===");           console.log(raw_ww.summary);
console.log("=== PRIMARY EFFLUENT ==="); console.log(pst.effluent.summary);
console.log("=== PRIMARY SLUDGE ===");   console.log(pst.wastage.summary);
console.log("=== AS EFFLUENT ===");      console.log(as.effluent.summary);
console.log("=== AS SLUDGE ===");        console.log(as.wastage.summary);

//Soluciona xarxa
xarxa.soluciona(verbose=false);
