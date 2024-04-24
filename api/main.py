import json
import os
import random
from flask import Flask, request, jsonify
from flask_cors import CORS
from collections import Counter

app = Flask(__name__)
CORS(app)
routes_file = 'routes.json'


def hash_route(route):
    return hash(
        (
            frozenset(route['idx']),
            frozenset(route['type'])
        )
    )


def load_routes(routes_file=routes_file):
    if os.path.exists(routes_file):
        with open(routes_file, 'r') as file:
            return json.load(file)
    else:
        return {}


routes = load_routes(routes_file)
random_names = set(x.replace(' ', '-') for x in load_routes('random_names.json'))
names_hash = {}
routes_hash = {}
for idx, route in enumerate(routes):
    random_names.discard(route['name'])
    names_hash[route['name']] = idx
    routes_hash[hash_route(route)] = idx


def validate_route(new_route):
    print(new_route)
    name = new_route.get('name')
    grade = new_route.get('grade')
    idx = new_route.get('idx')
    type_ = new_route.get('type')

    error_codes = []
    if not name:
        error_codes.append({'code': 'nn',
                            'message': 'Name not provided'})
    elif name in names_hash:
        error_codes.append({'code': 'ne',
                            'message': f'Route already exists with name {name}'})

    if not grade:
        error_codes.append({'code': 'ng',
                            'message': 'Grade not provided'})

    rh = hash_route(new_route)
    if rh in routes_hash:
        found = routes[routes_hash[rh]]['name']
        error_codes.append({'code': 're',
                            'message': f'An identical route named {found} exists'})

    if not idx or len(idx) == 0:
        error_codes.append({'code': 'ni',
                            'message': 'No holds provided'})
    if not type_ or len(type_) == 0:
        error_codes.append({'code': 'nt',
                            'message': 'No types provided'})

    if len(idx) != len(type_):
        error_codes.append({'code': 'it',
                            'message': 'Number of holds and types do not match'})

    type_counter = Counter(type_)
    hold_types = {'any': 0, 'start': 1, 'finish': 2, 'foot': 3}
    start_count = type_counter[hold_types['start']]
    end_count = type_counter[hold_types['finish']]

    if (start_count > 2) or (start_count < 1):
        error_codes.append({'code': 'ns',
                            'message': f'Must have 1 or 2 start holds, found {start_count}'})
    if (end_count > 2) or (end_count < 1):
        error_codes.append({'code': 'nf',
                            'message': f'Must have 1 or 2 finish holds, found {end_count}'})

    return error_codes


def save_routes(routes):
    with open(routes_file, 'w') as file:
        json.dump(routes, file, indent=4, default=str)


def get_random_name():
    return random.choice(tuple(random_names))


@app.route('/get_routes', methods=['GET'])
def get_routes():
    return jsonify(routes)


@app.route('/get_route/<name>', methods=['GET'])
def get_route(name):
    if name in names_hash:
        return jsonify(routes[names_hash[name]])
    else:
        return jsonify(404)


@app.route('/save_route', methods=['POST'])
def save_route():
    new_route = request.json
    error_codes = validate_route(new_route)
    if len(error_codes) > 0:
        return jsonify({'errors': error_codes})

    # Remove name and insert the rest under the name key
    name = new_route.get('name')
    routes.append(new_route)
    names_hash[name] = len(routes) - 1
    routes_hash[hash_route(new_route)] = len(routes) - 1
    random_names.discard(name)

    save_routes(routes)

    return jsonify({'message': f'Route {name} added!'})


@app.route('/random_name', methods=['GET'])
def random_name():
    return jsonify({'name': get_random_name()})


@app.route('/delete_route/<name>', methods=['DELETE'])
def delete_route(name):
    if name in names_hash:
        idx = names_hash[name]
        del routes[idx]
        del names_hash[name]
        random_names.add(name)
        save_routes(routes)
        return jsonify({'message': f'Route {name} deleted successfully'})
    else:
        return jsonify({'error': f'Route {name} not found'}), 404


# route_exists post request to check if name exists or if a route with the same holds exists
@app.route('/validate_route', methods=['POST'])
def route_exists():
    new_route = request.json
    return jsonify({'errors': validate_route(new_route)})


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=1234)
