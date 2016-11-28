## Special device that transforms a writer into a reader

`import * as f from 'f-streams'`

* `uturn = ez.devices.uturn.create()`  
  creates a uturn device.  
  The device has two properties: a `uturn.writer` to which you can write,   
  and a `uturn.reader` from which you can read.  
