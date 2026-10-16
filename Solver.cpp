#include <iostream>
#include <vector>
#include <string>
#include <queue>
#include <map>
#include <algorithm>
#include <chrono>
using namespace std;

struct State{
    vector<vector<char>> board;
    vector<pair<int, int>> path;
    int cost;
    bool operator>(const State& other) const{
        return cost > other.cost;
    }
};

pair<char, int> top(const vector<char>& bottle){
    for(int i = 3; i >= 0; i--){
        if(bottle[i] != '.'){
            return {bottle[i], i};
        }
    }
    return {'\0', -1};
}

bool isFull(const vector<char>& bottle){
    return bottle[3] != '.';
}

bool isEmpty(const vector<char>& bottle){
    return bottle[0] == '.';
}

int emptySlots(const vector<char>& bottle){
    int count = 0;
    for(int i = 3; i >= 0; i--){
        if(bottle[i] == '.'){
            count++;
        }else{
            break;
        }
    }
    return count;
}

int countTopSameColors(const vector<char>& bottle){
    pair<char, int> topInfo = top(bottle);
    if(isEmpty(bottle)){
        return 0;
    }
    int count = 0;
    char color = topInfo.first;
    for(int i = topInfo.second; i >= 0; i--){
        if(bottle[i] == color){
            count++;
        }else{
            break;
        }
    }
    return count;
}

bool isSolved(const vector<vector<char>>& board){
    for(const auto& bottle : board){
        if(isEmpty(bottle)){
            continue;
        }else{
            if(!isFull(bottle)){
                return false;
            }
            char firstColor = bottle[0];
            for(int i = 1; i < 4; i++){
                if(bottle[i] != firstColor){
                    return false;
                }
            }
        }
    }
    return true;
}

vector<pair<int, int>> getPossibleMoves(const vector<vector<char>>& currentBoard, int N){
    vector<pair<int, int>> moves;
    for(int src = 0; src < N; src++){
        for(int dest = 0; dest < N; dest++){
            if(src == dest){
                continue;
            }
            const auto& source = currentBoard[src];
            const auto& destination = currentBoard[dest];
            if(isEmpty(source)){
                continue;
            }
            if(isFull(destination)){
                continue;
            }
            char topSrc = top(source).first;
            char topDest = top(destination).first;
            if(topDest == '\0' || topSrc == topDest){
                if(emptySlots(destination) > 0){
                    moves.push_back({src, dest});
                }
            }
        }
    }
    return moves;
}

vector<vector<char>> applyMove(const vector<vector<char>>& current, int src, int dest){
    vector<vector<char>> newBoard = current;
    auto& source = newBoard[src];
    auto& destination = newBoard[dest];
    pair<char, int> topSrc = top(source);
    char topSrcColor = topSrc.first;
    int topSrcIndex = topSrc.second;
    int sameColorsAtSrcTop = countTopSameColors(source);
    int slots = emptySlots(destination);
    int pourAmount = min(sameColorsAtSrcTop, slots);
    for(int i = 0; i < pourAmount; i++){
        int destPourIndex = top(destination).second + 1;
        destination[destPourIndex] = topSrcColor;
        source[topSrcIndex - i] = '.';
    }
    return newBoard;
}

int heuristic(const vector<vector<char>>& board){
    int h = 0;
    for(const auto& bottle : board){
        char prevColor = '\0';
        for(int i = 0; i < 4; ++i){
            char currentColor = bottle[i];
            if(currentColor != '.' && prevColor != '\0' && currentColor != prevColor){
                h++;
            }
            prevColor = currentColor;
        }
    }
    return h;
}

string matrixToStr(const vector<vector<char>>& board){
    string s = "";
    for(const auto& bottle : board){
        for(char c : bottle){
            s += c;
        }
    }
    return s;
}

vector<pair<int, int>> solve(vector<vector<char>> initialBoard, int N, long long& stateChecked){
    priority_queue<State, vector<State>, greater<State>> openList;
    map<string, int> closedList;
    State startState;
    startState.board = initialBoard;
    startState.cost = heuristic(initialBoard);
    openList.push(startState);
    closedList[matrixToStr(startState.board)] = 0;
    stateChecked = 0;
    while (!openList.empty()){
        State currentState = openList.top();
        openList.pop();
        stateChecked++; // Count each state checked
        int currentG = currentState.path.size();
        if(currentG > closedList[matrixToStr(currentState.board)]){
            continue;
        }
        if(isSolved(currentState.board)){
            return currentState.path;
        }
        vector<pair<int, int>> possibleMoves = getPossibleMoves(currentState.board, N);
        for (const auto& move : possibleMoves) {
            vector<vector<char>> nextBoard = applyMove(currentState.board, move.first, move.second);
            string nextBoardString = matrixToStr(nextBoard);
            int nextG = currentG + 1;
            if(closedList.find(nextBoardString) == closedList.end() || nextG < closedList[nextBoardString]){
                State nextState;
                nextState.board = nextBoard;
                nextState.path = currentState.path;
                nextState.path.push_back(move);
                nextState.cost = nextG + heuristic(nextBoard);
                openList.push(nextState);
                closedList[nextBoardString] = nextG;
            }
        }
    }
    return {};
}

int main() {
    int N;
    cout << "Enter the number of bottles (N): ";
    cin >> N;
    vector<vector<char>> Board(N, vector<char>(4, '.')); 
    cout << "Enter bottle configurations (example: 'AABB', 'CC..', '....'):" << endl;
    for (int i = 0; i < N; ++i) {
        string s;
        cout << "Bottle " << (i + 1) << ": ";
        cin >> s;
        for(int j = 0; j < 4; ++j){
            Board[i][j] = s[j];
        }
    }
    long long stateChecked = 0;
    auto start = chrono::high_resolution_clock::now();
    vector<pair<int, int>> solutions = solve(Board, N, stateChecked);
    auto end = chrono::high_resolution_clock::now();
    chrono::duration<double> elapsed = end - start;

    if(!solutions.empty()){
        cout << "Number of steps: " << solutions.size() << endl;
        cout << "Steps:" << endl;
        for(const auto& move : solutions){
            cout << "Move water from bottle " << (move.first + 1) << " to bottle " << (move.second + 1) << endl;
        }
    } else {
        cout << "No solution found" << endl;
    }
    cout << "States checked: " << stateChecked << endl;
    cout << "Time consumed: " << elapsed.count() << " seconds" << endl;
    return 0;
}
