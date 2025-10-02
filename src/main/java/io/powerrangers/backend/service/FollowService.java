package io.powerrangers.backend.service;

import io.powerrangers.backend.dao.FollowRepository;
import io.powerrangers.backend.dao.UserRepository;
import io.powerrangers.backend.dto.FollowCheckResponseDto;
import io.powerrangers.backend.dto.FollowCountResponseDto;
import io.powerrangers.backend.dto.FollowRequestDto;
import io.powerrangers.backend.dto.FollowResponseDto;
import io.powerrangers.backend.dto.TaskScope;
import io.powerrangers.backend.dto.UserFollowResponseDto;
import io.powerrangers.backend.entity.Follow;
import io.powerrangers.backend.entity.User;
import io.powerrangers.backend.exception.CustomException;
import io.powerrangers.backend.exception.ErrorCode;
import io.powerrangers.backend.service.notification.NotificationSender;
import io.powerrangers.backend.service.notification.NotificationType;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FollowService {

    private final FollowRepository followRepository;
    private final UserRepository userRepository;
    private final NotificationSender notificationSender;

    @Transactional
    public FollowResponseDto follow(FollowRequestDto request){
        User follower = userRepository.findById(ContextUtil.getCurrentUserId())
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        User following = userRepository.findById(request.getFollowingId())
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        if( followRepository.existsByFollowerAndFollowing(follower, following)) {
            throw new CustomException(ErrorCode.ALREADY_FOLLOWED);
        }

        Follow follow = Follow.builder()
                        .follower(follower)
                        .following(following)
                        .build();

        try {
            followRepository.save(follow);

            notificationSender.send(
                String.valueOf(following.getId()),
                    NotificationType.FOLLOW_CREATED,
                    follower.getNickname() + "님이 나를 팔로우했습니다!",
                    Map.of("followerId", follower.getId())
            );
        } catch (DataIntegrityViolationException e){
            throw new CustomException(ErrorCode.ALREADY_FOLLOWED);
        }

        return FollowResponseDto.builder()
                .followId(follow.getId())
                .followerId(follow.getFollower().getId())
                .followingId(follow.getFollowing().getId())
                .build();
    }

    @Transactional
    public void unfollow(Long followingId) {
        User follower = userRepository.findById(ContextUtil.getCurrentUserId())
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        User following = userRepository.findById(followingId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        Follow follow = followRepository.findByFollowerAndFollowing(follower, following)
                .orElseThrow(() -> new CustomException(ErrorCode.FOLLOW_NOT_FOUND));

        followRepository.delete(follow);
    }

    @Transactional(readOnly=true)
    public List<UserFollowResponseDto> findFollowers(Long userId){
        userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        // 팔로잉에 userId가 있어야 한다.
        List<User> users = followRepository.findFollowersByUser(userId);
        return users.stream()
                .map(user -> UserFollowResponseDto.from(user))
                .toList();
    }

    @Transactional(readOnly=true)
    public List<UserFollowResponseDto> findFollowings(Long userId) {
        userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        // 팔로워 id에 userId가 있어야 한다.
        List<User> users = followRepository.findFollowingsByUser(userId);
        return users.stream()
                .map(user -> UserFollowResponseDto.from(user))
                .toList();
    }

    @Transactional(readOnly=true)
    public FollowCheckResponseDto checkFollowingRelationship(Long userId) {
        Long myId = ContextUtil.getCurrentUserId();

        User me = userRepository.findById(myId).orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        User target = userRepository.findById(userId).orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        return FollowCheckResponseDto.builder()
                .userId(userId)
                .following(followRepository.existsByFollowerAndFollowing(me, target))
                .build();
    }

    @Transactional(readOnly=true)
    public TaskScope checkScopeWithUser (Long userId){
        Long myId = ContextUtil.getCurrentUserId();
        if(myId.equals(userId)){
            // 내 아이디 -> PUBLIC, PRIVATE, FOLLOWER 다 줘도 됨.
            return TaskScope.PRIVATE;
        }

        User me = userRepository.findById(myId).orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        User target = userRepository.findById(userId).orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        boolean following = followRepository.existsByFollowerAndFollowing(me, target);
        boolean followed = followRepository.existsByFollowerAndFollowing(target, me);

        if(following && followed){
            // 맞팔 관계 -> PUBLIC, FOLLOWER 까지 줘도 됨.
            return TaskScope.FOLLOWERS;
        }
        // PUBLIC 만 줘야 함.
        return TaskScope.PUBLIC;
    }

    @Transactional
    public FollowCountResponseDto getFollowCount(Long userId) {
        userRepository.findById(userId).orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        Long followersOfUser = followRepository.countFollowersByUser(userId);
        Long followingsOfUser = followRepository.countFollowingsByUser(userId);

        return FollowCountResponseDto.builder()
                .userId(userId)
                .followerCount(followersOfUser)
                .followingCount(followingsOfUser)
                .build();
    }

}
