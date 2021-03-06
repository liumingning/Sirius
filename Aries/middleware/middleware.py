#encoding=utf8
from django.shortcuts import render_to_response
from django.http import HttpResponse
import json
class UserSessionMiddleware(object):
    def process_request(self, request):
        path = request.path
        print path
        response = HttpResponse()
        res = {}
        if path.startswith('/static/') or path == "/login":
            # static file type or /login
            return None
        if not request.user.is_authenticated():
            if path.startswith('/v1/'):
                # api type
                res["code"] = 401
                res["data"] = "sesson failure!"
                response.write(json.dumps(res))
                return response
            else:
                # other
                user = ""
                user = json.dumps(user)
                return render_to_response('index/index.html', locals())
