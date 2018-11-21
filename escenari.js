/*
  Definició d'un escenari complet: xarxa de trams de riu amb depuradores
  7 trams i una EDAR al tram 5

          EDAR
  t1--+     |
      |--> t5--+
  t2--+        |
                +--> t7
  t3--+        |
      |--> t6--+
  t4--+

*/

//Carrega arxius necessaris
const State_Variables = require('./state-variables.js'); //class State_Variables
const Tram            = require('./tram.js');            //class Tram
const Xarxa           = require('./xarxa.js');           //class Xarxa
require('./primary-settler.js');                         //tecnologia primary_settler    (dins de State Variables)
require('./activated-sludge.js');                        //tecnologia activated_sludge   (dins de State Variables)
require('./nitrification.js');                           //tecnologia nitrification      (dins de State Variables)
require('./denitrification.js');                         //tecnologia denitrification    (dins de State Variables)
require('./chemical-P-removal.js');                      //tecnologia chemical P removal (dins de State Variables)

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

//syntax--------------------------------(Q    VFA FBSO BPO UPO USO iSS FSA OP NOx)
t1.state_variables = new State_Variables(100, 1,  0,   0,  0,  0,  0,  0,  0, 0  );
t2.state_variables = new State_Variables(100, 1,  0,   0,  0,  0,  0,  0,  0, 0  );
t3.state_variables = new State_Variables(100, 0,  0,   0,  0,  0,  0,  0,  0, 0  );
t4.state_variables = new State_Variables(100, 0,  0,   0,  0,  0,  0,  0,  0, 0  );
t5.state_variables = new State_Variables(  0, 0,  0,   0,  0,  0,  0,  0,  0, 0  );
t6.state_variables = new State_Variables(  0, 0,  0,   0,  0,  0,  0,  0,  0, 0  );
t7.state_variables = new State_Variables(  0, 0,  0,   0,  0,  0,  0,  0,  0, 0  );

//Afegeix una EDAR al tram 5
//syntax---------------------(Q,  VFA, FBSO, BPO, UPO, USO, iSS, FSA,  OP,   NOx)
let inf = new State_Variables(25, 50,  115,  440, 100, 45,  60,  39.1, 7.28, 0);
/*
  Configuració EDAR: influent ---> PST ---> AS ---> CPR ---> effluent
  Quan s'aplica una tecnologia a un objecte <State Variables> es genera un "resultat de procés"
  A dins hi ha 2 nous objectes <State Variables> i un objecte amb els resultats del procés amb la forma 
  {value, unit, description}
*/

/*Apply PST + AS + N + DN + CPR*/
//pst syntax-----------------(fw,    removal_BPO, removal_UPO, removal_iSS)
let pst = inf.primary_settler(0.005, 42.335,      90.05,       75.125);
//as+n+dn syntax---------------------(T,  Vp,     Rs, RAS, waste_from, SF,   fxt,  DO,  pH,  IR,  DO_RAS, influent_alk)
let dn = pst.effluent.denitrification(16, 8473.3, 15, 1.0, 'reactor',  1.25, 0.39, 2.0, 7.2, 5.4, 1.0,    250 );
//cpr syntax----------------------------(FeCl3_volume, FeCl3_solution, FeCl3_unit_weight)
let cpr = dn.effluent.chemical_P_removal(6000,         37,             1.35);
//connecta la sortida al tram 5
t5.wwtp = cpr.effluent;

//Soluciona xarxa
//console.log("=== RESOL XARXA ==="); 
//xarxa.soluciona(verbose=true);
