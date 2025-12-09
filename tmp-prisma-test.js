prisma.('SELECT 1').then(function(res){ console.log(res); }).catch(function(err){ console.error('ERR', err); }).finally(function(){ prisma.(); });) 
