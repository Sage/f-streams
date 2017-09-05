## Special device that transforms a writer into a reader

`import { uturn } from 'f-streams'`

* `ut = uturn()`  
  creates a uturn device.  
  The device has two properties: a `ut.writer` to which you can write,   
  and a `ut.reader` from which you can read. 
