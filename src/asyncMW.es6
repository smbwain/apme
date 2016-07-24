
export default function(handler) {
    return function (req, res, next) {
        (async function() {
            try {
                const data = await handler(req, res);
                if(data === null) {
                    return;
                }
                if(data !== undefined) {
                    res.json(data);
                    return;
                }
            } catch(err) {
                next(err);
                return;
            }
            next();
        })();
    }
}