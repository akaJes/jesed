const DMP = require('diff-match-patch');
const chokidar = require('chokidar');
const ot = require('ot-jes');
const WrappedOperation = require('ot-jes/lib/wrapped-operation');

const dmp = new DMP();
dmp.Diff_Timeout = 1;
dmp.Diff_EditCost = 10;

function scan(from, to) {
  var d = dmp.diff_main(from, to);
  //dmp.diff_cleanupSemantic(d); //semantic //TODO: add mode
  dmp.diff_cleanupEfficiency(d); //efficiency
  if (d.length == 1 && d[0][0] == 0) return;
  var op  = new ot.TextOperation();
  d.filter(function(i) { return i[1].length; })
  .map(function(i, n, o) {
    if (!i[0]) {
      op = op.retain(i[1].length)
    } else
    if (i[0] == -1) {
      op = op.delete(i[1].length)
    } else
    if (i[0] == 1) {
      op = op.insert(i[1])
    }
  }); //d
  return op;
}

function Operation(io, doc, operation) {
  var wrapped;
  const clientId = 'host';
  const revision = doc.operations.length;
  try {
    wrapped = new WrappedOperation(
      ot.TextOperation.fromJSON(operation),
      undefined
    );
  } catch (exc) {
    console.error("Invalid operation received: " + exc);
    return;
  }
  try {
    const wrappedPrime = doc.receiveOperation(revision, wrapped);
    console.log("new operation: " + wrapped);
    io.of(doc.docId).in(doc.docId).emit(
      'operation', clientId,
      wrappedPrime.wrapped.toJSON(), wrappedPrime.meta
    );
  } catch (exc) {
    console.error(exc);
  }
};

module.exports = (io, ob, text) => {
  if(ob.freeze) {
    console.log('frozen')
    return
  }
  console.log(`File ${ob.id} has been changed`);
  const op = scan(ob.ot.document, text.toString());
  if (op)
    Operation(io, ob.ot, op.ops)
}
