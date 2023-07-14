import { useCallback, useEffect, useState, Fragment } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { redirect } from 'react-router-dom';
import { formatSeconds } from '../utils/helpers';

import { store } from '../store/store';
import { toastActions } from '../store/toastSlice';
import { gameActions } from '../store/gameSlice';
import { socket } from '../websocket';

import Row from '../layout/Grid/Row';
import Container from '../layout/Grid/Container';
import Column from '../layout/Grid/Column';
import Board from '../components/Games/Board';
import Button from '../components/UI/Button';
import PlayerCard from '../components/Games/PlayerCard';
import Chat from '../components/Games/Chat';

import './GameDetail.scss';

let interval;

const GameDetailPage = () => {
    const dispatch = useDispatch();
    const username = useSelector(state => state.user.username);
    const game = useSelector(state => state.game);
    const isBlackPlayer = username && game.black.user.username === username;
    const isWhitePlayer = username && game.white.user.username === username;
    const isPlayer = isBlackPlayer || isWhitePlayer;
    const [timer, setTimer] = useState(null);

    const cancelGameHandler = useCallback(() => {
        if(isPlayer && game.status === 'waiting') {
            socket.emit('cancelGame', game._id);
        }
    }, [isPlayer, game.status, game._id]);

    useEffect(() => {
        if(game.status === 'waiting') {
            const waitingEndsAt = new Date(game.waitingEndsAt);
            const waitingTimeoutInSeconds = Math.floor((waitingEndsAt - Date.now()) / 1000);

            setTimer(waitingTimeoutInSeconds);
        }
    }, [game.status, game.waitingEndsAt]);

    useEffect(() => {
        if(timer >= 0) {
            // TODO: Use worker timers instead to prevent suspension of intervals
            // https://www.npmjs.com/package/worker-timers
            interval = setInterval(() => {
                setTimer(prevTimer => prevTimer - 1);
            }, 1000);

            return () => {
                clearInterval(interval);
            };
        }
    }, [timer]);

    // @@@ reset gameSlice state when user leaves this page/router element
    useEffect(() => {
        console.log('rendering', timer);
        return () => {
            console.log('leaving!');
        };
    }, []);

    return (
        <Container fluid fillVertically>
            <Row columns={2} className="h-100">
                <Column size={7} style={{ height: isPlayer ? 'calc(100% - 7.3rem)' : 'calc(100% - 3.25rem)' }}>
                    <h2 className="board-heading">
                        {game.status === 'waiting' && `Waiting for black to play (${formatSeconds(timer)})`}
                        {game.status === 'cancelled' && 'The game has been cancelled!'}
                        {(game.status === 'cancelled_by_black' || game.status === 'cancelled_by_white') && `The game has been cancelled by ${game.status.replace('cancelled_by_', '')} player!`}
                    </h2>
                    <Board size={game.size} state={game.board} className="mb-4" dynamicHeight />
                    {isPlayer && (
                        <div className="board-options">
                            {game.status === 'started' && (
                                <Fragment>
                                    <Button>
                                        Resign
                                    </Button>
                                    <Button>
                                        Pass
                                    </Button>
                                    <Button>
                                        Undo
                                    </Button>
                                </Fragment>
                            )}
                            {game.status === 'waiting' && (
                                <Button onClick={cancelGameHandler}>
                                    Cancel game
                                </Button>
                            )}
                            {(game.status.includes('cancelled') || game.status === 'finished') && (
                                <Button>
                                    Rematch
                                </Button>
                            )}
                        </div>
                    )}
                </Column>
                <Column size={5}>
                    <div className="d-flex flex-column h-100">
                        <Row>
                            <Column>
                                <PlayerCard
                                    color="black"
                                    username={game.black.user.username}
                                    elo={game.black.user.elo}
                                    avatar={game.black.user.avatar}
                                    time-remaining={game.black.timeRemaining}
                                    score={game.black.score}
                                    is-online={isBlackPlayer || game.black.user.isOnline}
                                    active={true}
                                />
                            </Column>
                            <Column>
                                <PlayerCard
                                    color="white"
                                    username={game.white.user.username}
                                    elo={game.white.user.elo}
                                    avatar={game.white.user.avatar}
                                    time-remaining={game.white.timeRemaining}
                                    score={game.white.score}
                                    is-online={isWhitePlayer || game.white.user.isOnline}
                                />
                            </Column>
                        </Row>
                        <Chat />
                    </div>
                </Column>
            </Row>
        </Container>
    );
};

export const loader = async ({ params }) => {
    const response = await fetch('http://localhost:3000/api/games/' + params.gameId);

    const resData = await response.json();

    if(!response.ok && !response.game) {
        store.dispatch(toastActions.add({
            message: 'Game could not found!',
            status: 'danger',
            delay: false
        }));
    
        return redirect('/');
    }

    store.dispatch(gameActions.updateGame(resData.game));

    socket.emit('joinGameRoom', resData.game._id);
    console.log('joining!');

    return null;
};

export default GameDetailPage;