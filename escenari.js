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
let t1 = new Tram() ; /*node arrel*/   ; xarxa.trams.push(t1);
let t2 = new Tram() ; /*node arrel*/   ; xarxa.trams.push(t2);
let t3 = new Tram() ; /*node arrel*/   ; xarxa.trams.push(t3);
let t4 = new Tram() ; /*node arrel*/   ; xarxa.trams.push(t4);
let t5 = new Tram() ; t5.pares=[t1,t2] ; xarxa.trams.push(t5);
let t6 = new Tram() ; t6.pares=[t3,t4] ; xarxa.trams.push(t6);
let t7 = new Tram() ; t7.pares=[t5,t6] ; xarxa.trams.push(t7);

//Variables d'estat inicials | sintaxi: new(nom,S_VFA,S_FBSO,X_BPO,X_UPO,S_USO,X_iSS,S_FSA,S_OP,S_NOx)
t1.state_variables = new State_Variables('t1', 1, 0, 0, 0, 0, 0, 0, 0, 0);
t2.state_variables = new State_Variables('t2', 1, 0, 0, 0, 0, 0, 0, 0, 0);
t3.state_variables = new State_Variables('t3', 0, 0, 0, 0, 0, 0, 0, 0, 0);
t4.state_variables = new State_Variables('t4', 0, 0, 0, 0, 0, 0, 0, 0, 0);
t5.state_variables = new State_Variables('t5', 0, 0, 0, 0, 0, 0, 0, 0, 0);
t6.state_variables = new State_Variables('t6', 0, 0, 0, 0, 0, 0, 0, 0, 0);
t7.state_variables = new State_Variables('t7', 0, 0, 0, 0, 0, 0, 0, 0, 0);

//Afegeix una EDAR al tram 5 (variables d'estat influent)
t5.wwtp = new State_Variables('edar t5', 50, 186, 707, 150, 58, 100, 59.6, 14.15, 0);

//Aplica configuració EDAR: PST+AS+NITRI
let influent_totals = t5.wwtp.compute_totals(); //COD, TOC, TKN, TP, TSS
let results_pst     = t5.wwtp.primary_settler (Q=25000, fw=0.005, removal_BPO=0, removal_UPO=0, removal_iSS=0);
let results_as      = t5.wwtp.activated_sludge(Q=24875, T=16, Vp=8473, Rs=15);
let results_nit     = t5.wwtp.nitrification   (Q=24875, T=16, Vp=8473, Rs=15, SF=1.25, fxt=0.39);

//Mostra fraccionament entrada
console.log("=== Influent totals ===");
console.log(influent_totals);
//Mostra resultats processos
console.log("=== Primary settler results ===");
console.log(results_pst);
console.log("=== Activated sludge results ===");
console.log(results_as);
console.log("=== Nitrification results ===");
console.log(results_nit);

//Soluciona xarxa
xarxa.soluciona(verbose=true);
