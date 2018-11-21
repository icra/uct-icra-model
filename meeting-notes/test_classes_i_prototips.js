class Objecte {
  constructor(a,b){
    this.a=a;
    this.b=b;
  }
  metode(){ console.log('has cridat la funcio metode'); }
}

Objecte.prototype.proto1=function(){ console.log('has cridat proto1'); }
Objecte.prototype.proto2=function(){ console.log('has cridat proto2'); }

let ob = new Objecte(1,2);
ob.metode()
ob.proto1()
ob.proto2()
console.log(ob);
console.log(Objecte.prototype);
