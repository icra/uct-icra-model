//WORK IN PROGRESS
//(status: not integrated)

//SBR

//inputs
let BOD        = 394;      //mg/L
let sBOD       = 131;      //mg/L
let COD        = 534.2;    //mg/L
let sCOD       = 151.6;    //mg/L
let TSS        = 299;      //mg/L
let VSS        = 285;      //mg/L
let TKN        = 65.23;    //mg/L
let NH4_N      = 41.12;    //mg/L
let TP         = 10.549;   //mg/L
let Alkalinity = 1052;     //mg/L
let Q          = 1559.333; //m3/d

let DSVI       = 197;      //mL/gTSS
let SRT        = 19.2;     //d

let V_p           = 1820;              //m3/tank
let pump_flowrate = 105;               //m3/d

let number_of_reactors = 2; //reactors

//times
let t_F  = 4; //h | fill time
let t_A  = 2; //h | aerate time
let t_S  = 1; //h | settle time
let t_D  = 1; //h | decant/extract time

let check_t_F = t_A + t_S + t_D;
if(check_t_F != t_F){throw new Error("t_F != t_A+t_S+t_D");}

//total cycle time
let T_C                               = t_F + t_A + t_S + t_D; //h/cycle
let number_of_cycles_per_tank_per_day = 24/T_C; //cycles/day/tank
let total_number_of_cycles_per_day    = number_of_reactors*number_of_cycles_per_tank_per_day;

//volumes
let V_F = pump_flowrate*t_F; //m3 | fill volume per cycle
let V_s = V_p - V_F;         //m3 | settled volume after decant

//checks
let check1 = V_s+V_F           == V_p; //true/false
let check2 = V_F/V_p + V_s/V_p == 1;   //true/false
console.log({check1,check2});

//mass balance based on solids in the reactor
let X_s = 1e6/DSVI;    //g/m3
let X_t = V_s/V_p*X_s; //g/m3 | MLSS
console.log({X_s,X_t});

let TSS_was = V_p*number_of_reactors*X_t/SRT/1000; //kg/d
console.log({TSS_was});

//nitrification
//NITRIFICATION (in one tank = V_p)
//All the following is a loop for N_ae
//Determine amount of oxidizable N available
let Nc  = 26;  //g/m3
let Nae = 0.5; //g/m3 | Nae from activated sludge module or bio P removal module

//LOOP
let oxidizable_N_added_per_cycle             = V_F*Nc; //g
let NH4_N_remaining_before_fill              = V_s*Nae; //g
let total_oxidizable_N_at_beginning_of_cycle = (oxidizable_N_added_per_cycle + NH4_N_remaining_before_fill)*(1/V_p) //g/m3

let μAm = 0.45; //1/d
let YA  = 0.1;  //gVSS/gFSA
let DO  = 2;    //mgO/L
let K_O = 0.4;  //mgO/L
let Kn  = 1;    //mgN/L

//Note: k_d is decay constant, if in G.A.Ekama we do not have it, it will be k_d=0.06 1/d
const k_d = 0.06; //1/d
let Nitrifiers = (Q*YA*Nc*SRT)/((1+k_d*SRT)*V_p); //g/m3
console.log({Nitrifiers});

//Now, to determine NH4-N efluente concentration N_ae we apply kinetics as for a batch reactor (time depending):

let Nae_next = 1; //next iterated value for Nae

//Start loop for Nae
console.log({μAm,YA,DO,K_O,DO,t_A,Kn,total_oxidizable_N_at_beginning_of_cycle,Nae});
/*
Kn·ln(total_oxidizable_N_at_beginning_of_cycle/N_ae) + (total_oxidizable_N_at_the_beginning_of_cycle – N_ae) = Nitrifiers·(µ_Am/YA)·(DO/(K_O+DO))·t_A
Kn·ln(total_oxidizable_N_at_beginning_of_cycle/N_ae)   = Nitrifiers·(µ_Am/YA)·(DO/(K_O+DO))·t_A    - (total_oxidizable_N_at_beginning_of_cycle – Nae)
e^Kn + (total_oxidizable_N_at_beginning_of_cycle/N_ae) = e^(Nitrifiers·(µ_Am/YA)·(DO/(K_O+DO))·t_A - (total_oxidizable_N_at_beginning_of_cycle - Nae))
total_oxidizable_N_at_beginning_of_cycle/N_ae = e^(Nitrifiers·(µ_Am/YA)·(DO/(K_O+DO))·t_A - (total_oxidizable_N_at_beginning_of_cycle - Nae)) - e^Kn
Nae = total_oxidizable_N_at_beginning_of_cycle/(e^(Nitrifiers·(µ_Am/YA)·(DO/(K_O+DO))·t_A - (total_oxidizable_N_at_beginning_of_cycle - Nae)) - e^Kn)

x = a/(e^(b-(c-x))-d)
e^(b+x) - c = a/x
f(x)  = e^(b+x) - c - a/x
f'(x) = e^(b+x)     + a/x^2
*/
let a = total_oxidizable_N_at_beginning_of_cycle;
let b = Nitrifiers*(μAm/YA)*(DO/(K_O+DO))*t_A - total_oxidizable_N_at_beginning_of_cycle;
let c = Math.exp(Kn);
console.log({a,b,c});

//x_next = x(n-1) - f(x(n-1))/f'(x(n-1))
function newton_raphson(x){
  let fx = Math.exp(b+x) - c - a/x;
  let dx = Math.exp(b+x) + a/(x*x);
  return x-fx/dx;
}

console.log('loop start');
let x  = 10;                 //initial value for x
let x0 = x;                  //current value for x
let x1 = newton_raphson(x0); //next value for x
let iterations = 0;          //iterations counter
while(true){
  //check if solution has been found or didn't converge
  if(Math.abs(x0-x1) < 0.0000001 || iterations >= 1000){
    //console.log({iterations}); //debug
    break; //exit the loop
  }else{
    x0 = newton_raphson(x1); //update x0
    x1 = newton_raphson(x0); //update x1
    if(isNaN(x1)) x1 = Math.random()*100;
    iterations++;            //add 1 to iterations
  }
}
console.log({iterations,x1});
